"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'

interface InvoicingItem {
  id: string
  status: string
  totalAmount: number
  facilitationFee: number
  netAmount: number
  createdAt: string
  updatedAt: string
  talentRequest: { id: string; title: string; company: { id: string; name: string } }
  talentProfile: { id: string; name: string; company: { id: string; name: string } }
}

export default function AdminInvoicingPage() {
  const [items, setItems] = useState<InvoicingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)

  useEffect(() => { loadItems() }, [])

  const loadItems = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/invoicing')
      if (res.ok) {
        const data = await res.json()
        setItems(data.data)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMarkProcessed = async (engagementId: string) => {
    try {
      const res = await fetch('/api/admin/invoicing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engagementId,
          invoiceStatus: 'sent',
          sentDate: new Date().toISOString()
        })
      })
      if (res.ok) {
        loadItems() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to mark as processed:', error)
    }
  }

  const handleBulkProcess = async () => {
    if (selectedItems.size === 0) return
    
    setBulkProcessing(true)
    try {
      const promises = Array.from(selectedItems).map(engagementId =>
        fetch('/api/admin/invoicing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            engagementId,
            invoiceStatus: 'sent',
            sentDate: new Date().toISOString()
          })
        })
      )
      
      await Promise.all(promises)
      setSelectedItems(new Set())
      loadItems()
    } catch (error) {
      console.error('Failed to bulk process:', error)
    } finally {
      setBulkProcessing(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map(item => item.id)))
    }
  }

  const toggleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-gray-600"><Loader2 className="h-4 w-4 animate-spin" />Loading invoicing items...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manual Invoicing</h1>
          <p className="text-gray-600">Accepted engagements awaiting manual invoice processing</p>
        </div>
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {selectedItems.size} selected
            </span>
            <Button 
              onClick={handleBulkProcess} 
              disabled={bulkProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {bulkProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Process Selected
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-gray-600">No accepted engagements requiring manual invoicing</div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> 
              Invoicing Queue
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="checkbox"
                  checked={selectedItems.size === items.length && items.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Select All</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {items.map(item => (
                <div key={item.id} className="p-4 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleSelectItem(item.id)}
                      className="mt-1 rounded border-gray-300"
                    />
                    <div className="space-y-1">
                      <div className="font-medium">{item.talentRequest.title}</div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{item.talentProfile.name}</span> accepted by <span className="font-medium">{item.talentRequest.company.name}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Accepted: {new Date(item.updatedAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 space-x-4">
                        <span>Amount: R{Number(item.totalAmount).toLocaleString()}</span>
                        <span>Fee(5%): R{Number(item.facilitationFee).toLocaleString()}</span>
                        <span>Net: R{Number(item.netAmount).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.location.href = `/admin/engagements/${item.id}`}>View</Button>
                    <Button size="sm" onClick={() => handleMarkProcessed(item.id)}>
                      <FileText className="h-4 w-4 mr-1" /> Mark Processed
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <div className="text-sm text-orange-800">
              This invoicing flow is manual for now. The platform invoices the seeker, receives payment, the provider invoices the platform, and we pay the provider minus 5%.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
