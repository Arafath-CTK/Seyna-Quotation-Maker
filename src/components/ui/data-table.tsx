'use client';

import type React from 'react';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyState?: React.ReactNode;
  loading?: boolean;
  className?: string;
  paginated?: boolean;
  pageSize?: number;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = false,
  searchPlaceholder = 'Search...',
  emptyState,
  loading = false,
  className = '',
  paginated = false,
  pageSize = 10,
  showPageSizeSelector = true,
  pageSizeOptions = [5, 10, 20, 50],
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  // Filter data based on search term
  const filteredData = searchable
    ? data.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      )
    : data;

  // Sort data
  const sortedData = sortConfig
    ? [...filteredData].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      })
    : filteredData;

  const totalItems = sortedData.length;
  const totalPages = paginated ? Math.ceil(totalItems / currentPageSize) : 1;
  const startIndex = paginated ? (currentPage - 1) * currentPageSize : 0;
  const endIndex = paginated ? startIndex + currentPageSize : totalItems;
  const paginatedData = paginated ? sortedData.slice(startIndex, endIndex) : sortedData;

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setCurrentPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const getValue = (item: T, key: string) => {
    return key.includes('.') ? key.split('.').reduce((obj, k) => obj?.[k], item) : item[key];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        {searchable && (
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {paginated && showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Show:</span>
            <select
              value={currentPageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="border-input bg-background focus:border-primary focus:ring-primary rounded-md border px-3 py-1 text-sm focus:ring-1 focus:outline-none"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground text-sm">entries</span>
          </div>
        )}
      </div>

      {sortedData.length === 0 ? (
        <div className="py-12 text-center">
          {emptyState || (
            <>
              <div className="bg-muted mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                <Search className="text-muted-foreground h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No data found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No results match your search.' : 'No data available.'}
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full">
              <thead className="bg-muted/50 border-border border-b">
                <tr>
                  {columns.map((column, index) => (
                    <th
                      key={index}
                      className={`text-foreground px-6 py-4 text-left text-sm font-medium ${
                        column.headerClassName || ''
                      }`}
                    >
                      {column.sortable ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 font-medium hover:bg-transparent"
                          onClick={() => handleSort(String(column.key))}
                        >
                          {column.header}
                          {sortConfig?.key === column.key && (
                            <span className="ml-2">
                              {sortConfig.direction === 'asc' ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </span>
                          )}
                        </Button>
                      ) : (
                        column.header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {paginatedData.map((item, index) => (
                  <tr key={index} className="hover:bg-muted/30 transition-colors">
                    {columns.map((column, colIndex) => (
                      <td key={colIndex} className={`px-6 py-4 ${column.className || ''}`}>
                        {column.render
                          ? column.render(item)
                          : String(getValue(item, String(column.key)) || '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {paginated && totalPages > 1 && (
            <div className="border-border mt-6 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-muted-foreground text-sm">
                Showing <span className="text-foreground font-medium">{startIndex + 1}</span> to{' '}
                <span className="text-foreground font-medium">
                  {Math.min(endIndex, totalItems)}
                </span>{' '}
                of <span className="text-foreground font-medium">{totalItems}</span> entries
                {searchTerm && (
                  <span className="text-muted-foreground">
                    {' '}
                    (filtered from <span className="font-medium">{data.length}</span> total entries)
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-9 px-3"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(pageNumber)}
                        className="h-9 w-9 p-0"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-9 px-3"
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
