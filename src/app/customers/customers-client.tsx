'use client';

import type React from 'react';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  notes: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

const initialCustomer: Omit<Customer, '_id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  email: '',
  phone: '',
  company: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  notes: '',
  status: 'active',
};

export default function CustomersClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState(initialCustomer);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast('Error', {
        description: 'Failed to fetch customers',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer._id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast('Success', {
          description: `Customer ${editingCustomer ? 'updated' : 'created'} successfully`,
        });
        setDialogOpen(false);
        setEditingCustomer(null);
        setFormData(initialCustomer);
        fetchCustomers();
      } else {
        throw new Error('Failed to save customer');
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      toast('Error', {
        description: 'Failed to save customer',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      company: customer.company,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zipCode: customer.zipCode,
      country: customer.country,
      notes: customer.notes,
      status: customer.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast('Success', {
          description: 'Customer deleted successfully',
        });
        fetchCustomers();
      } else {
        throw new Error('Failed to delete customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast('Error', {
        description: 'Failed to delete customer',
      });
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      header: 'Name',
      sortable: true,
      render: (customer: Customer) => (
        <div className="flex flex-col">
          <span className="font-medium">{customer.name}</span>
          {customer.company && (
            <span className="text-muted-foreground text-sm">{customer.company}</span>
          )}
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Contact',
      header: 'Contact',
      render: (customer: Customer) => (
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="text-muted-foreground h-3 w-3" />
            <span>{customer.email}</span>
          </div>
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="text-muted-foreground h-3 w-3" />
              <span>{customer.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'address',
      label: 'Location',
      header: 'Location',
      render: (customer: Customer) => (
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="text-muted-foreground mt-0.5 h-3 w-3" />
          <div className="flex flex-col">
            {customer.address && <span>{customer.address}</span>}
            <span>
              {[customer.city, customer.state, customer.zipCode].filter(Boolean).join(', ')}
            </span>
            {customer.country && <span>{customer.country}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      header: 'Status',
      sortable: true,
      render: (customer: Customer) => (
        <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
          {customer.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      header: 'Created',
      sortable: true,
      render: (customer: Customer) => (
        <span className="text-muted-foreground text-sm">
          {new Date(customer.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      header: 'Actions',
      render: (customer: Customer) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(customer._id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
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
              <CardTitle>Customer Management</CardTitle>
              <CardDescription>
                Manage your customer database and contact information
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingCustomer(null);
                    setFormData(initialCustomer);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCustomer
                      ? 'Update customer information below.'
                      : 'Enter customer details to add them to your database.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">Zip Code</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as 'active' | 'inactive',
                        })
                      }
                      className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting
                        ? 'Saving...'
                        : editingCustomer
                          ? 'Update Customer'
                          : 'Add Customer'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={customers}
            columns={columns}
            loading={loading}
            searchPlaceholder="Search customers..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
