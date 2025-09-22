import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Users,
  FileText,
  DollarSign,
  ArrowUpRight,
  Plus,
  Activity,
  Clock,
  CheckCircle,
} from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, John</h1>
          <p className="text-muted-foreground mt-2">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Quote
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-muted-foreground text-xs">
              <span className="inline-flex items-center text-green-500">
                <TrendingUp className="mr-1 h-3 w-3" />
                +20.1%
              </span>{' '}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Quotes</CardTitle>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-muted-foreground text-xs">
              <span className="inline-flex items-center text-blue-500">
                <ArrowUpRight className="mr-1 h-3 w-3" />
                +12
              </span>{' '}
              this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-muted-foreground text-xs">
              <span className="inline-flex items-center text-green-500">
                <TrendingUp className="mr-1 h-3 w-3" />
                +5.2%
              </span>{' '}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68.2%</div>
            <p className="text-muted-foreground text-xs">
              <span className="inline-flex items-center text-green-500">
                <TrendingUp className="mr-1 h-3 w-3" />
                +2.4%
              </span>{' '}
              from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Quotes</CardTitle>
            <CardDescription>Your latest quotation activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { company: 'Acme Corp', amount: '$12,500', status: 'pending', time: '2 hours ago' },
              {
                company: 'TechStart Inc',
                amount: '$8,750',
                status: 'approved',
                time: '4 hours ago',
              },
              {
                company: 'Global Solutions',
                amount: '$15,200',
                status: 'pending',
                time: '1 day ago',
              },
              {
                company: 'Innovation Labs',
                amount: '$6,300',
                status: 'approved',
                time: '2 days ago',
              },
            ].map((quote, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                    <FileText className="text-primary h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{quote.company}</p>
                    <p className="text-muted-foreground text-sm">{quote.time}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-medium">{quote.amount}</span>
                  <Badge variant={quote.status === 'approved' ? 'default' : 'secondary'}>
                    {quote.status === 'approved' ? (
                      <CheckCircle className="mr-1 h-3 w-3" />
                    ) : (
                      <Clock className="mr-1 h-3 w-3" />
                    )}
                    {quote.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="h-12 w-full justify-start bg-transparent">
              <Plus className="mr-3 h-4 w-4" />
              Create New Quote
            </Button>
            <Button variant="outline" className="h-12 w-full justify-start bg-transparent">
              <Users className="mr-3 h-4 w-4" />
              Add Customer
            </Button>
            <Button variant="outline" className="h-12 w-full justify-start bg-transparent">
              <FileText className="mr-3 h-4 w-4" />
              View Reports
            </Button>
            <Button variant="outline" className="h-12 w-full justify-start bg-transparent">
              <Activity className="mr-3 h-4 w-4" />
              Analytics Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
