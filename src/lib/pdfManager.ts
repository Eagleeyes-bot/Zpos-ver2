import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export interface BusinessReportData {
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  topBrands: { name: string; sales: number }[];
  monthlySales: { month: string; amount: number }[];
  activeInstallments: { customer: string; device: string; remaining: number; nextDueDate: string }[];
  userEmail: string;
}

export const generateBusinessReport = async (data: BusinessReportData) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();

  // Header
  pdf.setFontSize(22);
  pdf.setTextColor(14, 165, 233); // sky-600
  pdf.text('Business Analytics Report', 15, 20);
  
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(`Generated for: ${data.userEmail}`, 15, 28);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 15, 33);

  // Financial Summary Cards
  pdf.setDrawColor(241, 245, 249);
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(15, 40, 55, 30, 3, 3, 'FD');
  pdf.roundedRect(75, 40, 55, 30, 3, 3, 'FD');
  pdf.roundedRect(135, 40, 55, 30, 3, 3, 'FD');

  pdf.setFontSize(8);
  pdf.setTextColor(100);
  pdf.text('TOTAL REVENUE', 20, 48);
  pdf.text('TOTAL COST', 80, 48);
  pdf.text('TOTAL PROFIT', 140, 48);

  pdf.setFontSize(14);
  pdf.setTextColor(15, 23, 42); // slate-900
  pdf.text(`฿${data.totalSales.toLocaleString()}`, 20, 60);
  pdf.text(`฿${data.totalCost.toLocaleString()}`, 80, 60);
  
  pdf.setTextColor(5, 150, 105); // emerald-600
  pdf.text(`฿${data.totalProfit.toLocaleString()}`, 140, 60);

  // Top Brands Table
  pdf.setFontSize(14);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Top 5 Performing Brands', 15, 85);

  autoTable(pdf, {
    startY: 90,
    head: [['Brand Name', 'Total Sales Volume']],
    body: data.topBrands.map(b => [b.name, `฿${b.sales.toLocaleString()}`]),
    theme: 'striped',
    headStyles: { fillColor: [14, 165, 233], fontSize: 10 },
    styles: { fontSize: 9 }
  });

  // Monthly Sales Table
  const currentY = (pdf as any).lastAutoTable.finalY + 15;
  pdf.text('Monthly Sales Performance', 15, currentY);

  autoTable(pdf, {
    startY: currentY + 5,
    head: [['Month', 'Amount']],
    body: data.monthlySales.map(m => [m.month, `฿${m.amount.toLocaleString()}`]),
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], fontSize: 10 },
    styles: { fontSize: 9 }
  });

  // Active Installments (New Page)
  pdf.addPage();
  pdf.setFontSize(18);
  pdf.setTextColor(14, 165, 233);
  pdf.text('Active Installments Registry', 15, 20);

  autoTable(pdf, {
    startY: 30,
    head: [['Customer', 'Mobile Model', 'Remaining Balance', 'Next Due Date']],
    body: data.activeInstallments.map(i => [
      i.customer,
      i.device,
      `฿${i.remaining.toLocaleString()}`,
      i.nextDueDate
    ]),
    theme: 'striped',
    headStyles: { fillColor: [225, 29, 72], fontSize: 10 },
    styles: { fontSize: 8 }
  });

  pdf.save(`Business_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateInvoicePDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${filename}.pdf`);
};

export const printInvoicePDF = async (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  
  // Create Blob and open in new tab for printing
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};

export const generateInvoiceBlob = async (elementId: string): Promise<Blob | null> => {
  const element = document.getElementById(elementId);
  if (!element) return null;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  return pdf.output('blob');
};
