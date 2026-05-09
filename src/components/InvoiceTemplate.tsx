import React from 'react';
import { format } from 'date-fns';

interface InvoiceProps {
  id?: string;
  invoiceId: string;
  date: Date;
  branchName?: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  items: Array<{
    brand: string;
    model: string;
    imei: string;
    soldPrice: number;
  }>;
  subtotal: number;
  discount: number;
  finalTotal: number;
  paymentMethod: string;
}

export default function InvoiceTemplate({ 
  id = "invoice-capture",
  invoiceId, 
  date, 
  branchName,
  customer, 
  items, 
  subtotal, 
  discount, 
  finalTotal, 
  paymentMethod 
}: InvoiceProps) {
  return (
    <div 
      id={id}
      className="w-[210mm] min-h-[297mm] bg-white p-[25mm] text-gray-900 font-sans mx-auto flex flex-col"
      style={{ letterSpacing: '-0.015em' }}
    >
      {/* Brand Header */}
      <div className="flex justify-between items-start mb-16">
        <div className="flex flex-col gap-1">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed mt-1">
            <p className="text-gray-900">{branchName || 'Eagle Eyes Mobile POS'}</p>
            <p>eagleeyes.mobile@gmail.com</p>
            <p>0942933569</p>
            <p>MBK Center, Bangkok</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-4xl font-black tracking-tighter text-gray-100 mb-8 select-none uppercase">
            {branchName || 'INVOICE'}
          </h1>
          <div className="space-y-2">
            <div className="flex justify-end gap-6 text-[10px] uppercase font-black tracking-[0.2em] text-gray-400">
              <span>Invoice #</span>
              <span className="text-black">{invoiceId.slice(-8).toUpperCase()}</span>
            </div>
            <div className="flex justify-end gap-6 text-[10px] uppercase font-black tracking-[0.2em] text-gray-400">
              <span>Date</span>
              <span className="text-black">{format(date, 'yyyy-MM-dd')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bill To & Meta Section */}
      <div className="grid grid-cols-2 gap-20 mb-20">
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.25em] border-b border-gray-100 pb-2">Billing Details</h3>
          <div className="space-y-1">
            <p className="text-2xl font-black text-gray-900 tracking-tight">{customer.name}</p>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest space-y-1 pt-1">
              <p className="flex justify-between border-b border-gray-50 py-1">
                <span className="text-gray-400">Email</span>
                <span className="text-gray-900">{customer.email || '—'}</span>
              </p>
              <p className="flex justify-between border-b border-gray-50 py-1">
                <span className="text-gray-400">Phone</span>
                <span className="text-gray-900">{customer.phone}</span>
              </p>
              <div className="pt-2 text-gray-400 normal-case font-medium leading-relaxed italic">
                {customer.address || 'Default Delivery Address'}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] border-b border-gray-100 pb-2">Order Summary</h3>
          <div className="bg-gray-50 p-6 rounded-3xl space-y-3">
            <div className="flex justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</span>
              <span className="text-xs font-black tracking-tight">WEB-{invoiceId.slice(0, 6).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</span>
              <span className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-100 px-2 py-0.5 rounded">Paid</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment</span>
              <span className="text-xs font-black capitalize text-blue-600">{paymentMethod}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="flex-1">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-5 text-left text-[10px] font-black text-black uppercase tracking-[0.2em]">Imei No</th>
              <th className="py-5 text-left text-[10px] font-black text-black uppercase tracking-[0.2em]">Device Item Details</th>
              <th className="py-5 text-center text-[10px] font-black text-black uppercase tracking-[0.2em]">Qty</th>
              <th className="py-5 text-right text-[10px] font-black text-black uppercase tracking-[0.2em]">Unit Price</th>
              <th className="py-5 text-right text-[10px] font-black text-black uppercase tracking-[0.2em]">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => (
              <tr key={idx} className="group">
                <td className="py-8 font-mono text-[10px] font-bold text-gray-400">{item.imei}</td>
                <td className="py-8">
                  <p className="text-base font-black text-gray-900 tracking-tight">{item.model}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{item.brand} • Certified Premium</p>
                </td>
                <td className="py-8 text-center text-sm font-black text-gray-900">1</td>
                <td className="py-8 text-right text-sm font-bold text-gray-500">THB {item.soldPrice.toLocaleString()}</td>
                <td className="py-8 text-right text-sm font-black text-gray-900">THB {item.soldPrice.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end pt-12 border-t border-gray-100">
        <div className="w-[320px] space-y-4">
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest py-1">
            <span className="text-gray-400">Subtotal Amount</span>
            <span className="text-gray-900">THB {subtotal.toLocaleString()}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest py-1">
              <span className="text-gray-400">Discount Amount</span>
              <span className="text-rose-500">-THB {discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest py-1 border-b border-gray-50 pb-4">
            <span className="text-gray-400">Sales Tax (VAT 7%)</span>
            <span className="text-gray-900">Included</span>
          </div>
          <div className="flex justify-between items-end pt-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-1">Total Due Amount</span>
              <p className="text-[9px] text-gray-400 font-bold uppercase">Currency: THB</p>
            </div>
            <span className="text-4xl font-black tracking-tighter text-gray-900">THB {finalTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-16 pb-10">
        <div className="grid grid-cols-2 gap-10 border-t border-gray-100 pt-10">
          <div className="space-y-4">
            <p className="text-[10px] text-gray-400 leading-relaxed font-bold uppercase tracking-wider">
              Note: This is a digital invoice for your purchase. No physical receipt will be mailed. 
              Keep this document for your 1-year limited warranty registration.
            </p>
          </div>
          <div className="text-right flex flex-col justify-end">
            <p className="text-sm font-black text-gray-900">{branchName || 'Eagle Eyes Mobile POS'}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Premium Retail Partner • Bangkok</p>
            <p className="text-[10px] font-medium text-emerald-600 mt-2">zawyenaing.com</p>
          </div>
        </div>
      </div>

    </div>
  );
}
