import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { TuiIcon, TuiButton } from '@taiga-ui/core';
import { AgGridAngular } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ColDef,
  ICellRendererParams,
  ModuleRegistry,
  RowClassParams,
  themeQuartz,
} from 'ag-grid-community';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';
import { ApiService, DebtOrderReportRow, SalesReport, VariantReportRow } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  standalone: true,
  selector: 'app-advanced-reports',
  imports: [CommonModule, TranslocoModule, TuiIcon, TuiButton, AgGridAngular],
  templateUrl: './advanced-reports.html',
  styleUrl: './advanced-reports.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvancedReportsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly report = signal<SalesReport | null>(null);
  readonly debtRows = signal<DebtOrderReportRow[]>([]);
  readonly variantRows = signal<VariantReportRow[]>([]);

  readonly rangeStart = signal('');
  readonly rangeEnd = signal('');

  readonly bestSellerRows = computed(() => this.report()?.bestSellers ?? []);

  /** Các ngày có ít nhất một đơn PAID (doanh thu > 0 theo ngày tạo đơn). */
  readonly dailySalesRows = computed(() => this.report()?.revenueByDate ?? []);

  /** Hiển thị khoảng ngày theo lịch Việt Nam (dd/mm/yyyy). */
  readonly rangeLabelVi = computed(() => {
    const s = this.rangeStart();
    const e = this.rangeEnd();
    if (!s || !e) return '';
    try {
      const d0 = new Date(s + 'T12:00:00');
      const d1 = new Date(e + 'T12:00:00');
      if (Number.isNaN(d0.getTime()) || Number.isNaN(d1.getTime())) return `${s} → ${e}`;
      const opt: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      };
      return `${d0.toLocaleDateString('vi-VN', opt)} → ${d1.toLocaleDateString('vi-VN', opt)}`;
    } catch {
      return `${s} → ${e}`;
    }
  });

  readonly theme = themeQuartz;
  readonly localeText: Record<string, string> = AG_GRID_LOCALE_VI as unknown as Record<string, string>;

  readonly defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
    suppressHeaderMenuButton: true,
  };

  dailySalesColDefs: ColDef[] = [];
  bestSellerColDefs: ColDef[] = [];
  debtColDefs: ColDef[] = [];
  variantColDefs: ColDef[] = [];

  debtRowClass = (params: RowClassParams<DebtOrderReportRow>): string | undefined => {
    const d = params.data;
    if (!d) return undefined;
    if (this.isDebtAwaitingConfirm(d)) return 'ag-debt-awaiting';
    if (this.isDebtPaid(d)) return 'ag-debt-paid';
    return undefined;
  };

  constructor() {
    this.applyDayRange(30);
    void this.refresh();
  }

  ngOnInit(): void {
    this.buildColumnDefs();
  }

  private buildColumnDefs(): void {
    this.dailySalesColDefs = [
      {
        field: 'date',
        headerName: 'Ngày',
        minWidth: 168,
        maxWidth: 220,
        filter: 'agTextColumnFilter',
        headerTooltip:
          'Ngày tạo đơn (theo server). Chỉ liệt kê ngày có ít nhất một đơn đủ điều kiện PAID và được tính doanh thu.',
        valueFormatter: (p) => this.formatYmdToVi(p.value as string),
      },
      {
        field: 'paidOrderCount',
        headerName: 'Đơn PAID',
        width: 118,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        headerTooltip: 'Số đơn thanh toán PAID (được tính doanh thu) trong ngày.',
        valueFormatter: (p) => String(p.value ?? 0),
      },
      {
        field: 'itemsSoldQuantity',
        headerName: 'SL hàng',
        width: 100,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        headerTooltip: 'Tổng quantity tất cả dòng hàng trong các đơn PAID của ngày.',
        valueFormatter: (p) => String(p.value ?? 0),
      },
      {
        colId: 'paidOrdersDetail',
        headerName: 'Đơn trong ngày',
        flex: 1,
        minWidth: 260,
        filter: 'agTextColumnFilter',
        wrapText: true,
        autoHeight: true,
        headerTooltip: 'Bấm từng dòng để mở chi tiết đơn (trang Quản lý đơn).',
        valueGetter: (p) => {
          const d = p.data as SalesReport['revenueByDate'][number] | undefined;
          if (!d) return '';
          if (d.paidOrders?.length) {
            return d.paidOrders.map((o) => `#${o.orderId} ${o.customerLabel}`).join(' | ');
          }
          return d.paidOrdersSummary ?? '';
        },
        cellRenderer: (p: ICellRendererParams<SalesReport['revenueByDate'][number]>) =>
          this.renderDailyPaidOrdersCell(p),
      },
      {
        field: 'amount',
        headerName: 'Doanh thu',
        minWidth: 140,
        maxWidth: 180,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        headerTooltip: 'Tổng totalAmount các đơn PAID có ngày tạo = cột Ngày.',
        valueFormatter: (p) => this.formatVnd(p.value as number),
      },
    ];

    this.bestSellerColDefs = [
      {
        field: 'name',
        headerName: 'Tên sản phẩm',
        flex: 2,
        minWidth: 180,
        filter: 'agTextColumnFilter',
      },
      {
        field: 'quantity',
        headerName: 'SL bán',
        width: 130,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
      },
      {
        field: 'revenue',
        headerName: 'Doanh thu (trong kỳ)',
        width: 180,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        headerTooltip:
          'Tổng tiền hàng đã bán trong khoảng ngày đã chọn; chỉ tính phần đơn đã thanh toán (PAID), đồng bộ backend.',
        valueFormatter: (p) => this.formatVnd(p.value as number),
      },
    ];

    this.debtColDefs = [
      {
        field: 'orderId',
        headerName: 'Đơn',
        width: 110,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        valueFormatter: (p) => (p.value != null ? `#${p.value}` : '—'),
      },
      {
        field: 'customerName',
        headerName: 'Khách hàng',
        flex: 1,
        minWidth: 160,
        filter: 'agTextColumnFilter',
        valueFormatter: (p) => (p.value ? String(p.value) : '—'),
      },
      {
        field: 'customerGroupName',
        headerName: 'Nhóm KH',
        width: 140,
        filter: 'agTextColumnFilter',
        valueFormatter: (p) => (p.value ? String(p.value) : '—'),
      },
      {
        field: 'totalAmount',
        headerName: 'Số tiền',
        width: 150,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        valueFormatter: (p) =>
          p.value != null && p.value !== undefined ? `${this.formatNumber0(p.value as number)} ₫` : '—',
      },
      {
        field: 'dueDate',
        headerName: 'Hạn thanh toán',
        width: 140,
        filter: 'agTextColumnFilter',
        valueFormatter: (p) => this.formatDateCell(p.value as string | undefined),
      },
      {
        field: 'daysLeft',
        headerName: 'Còn (ngày)',
        width: 120,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
      },
      {
        field: 'debtStatus',
        headerName: 'Hạn nợ',
        width: 130,
        filter: 'agTextColumnFilter',
      },
      {
        colId: 'paymentLabel',
        headerName: 'Thanh toán',
        flex: 1,
        minWidth: 220,
        filter: 'agTextColumnFilter',
        valueGetter: (p) => this.debtPaymentLabel(p.data),
        valueFormatter: (p) => {
          const base = String(p.value ?? '—');
          const d = p.data as DebtOrderReportRow;
          if (this.isDebtAwaitingConfirm(d)) {
            return `${base} — Nhắc: vào Quản lý đơn để xác nhận`;
          }
          return base;
        },
      },
    ];

    this.variantColDefs = [
      {
        field: 'sku',
        headerName: 'SKU',
        width: 140,
        filter: 'agTextColumnFilter',
        valueFormatter: (p) => (p.value ? String(p.value) : '—'),
      },
      {
        field: 'productName',
        headerName: 'Sản phẩm',
        flex: 1,
        minWidth: 180,
        filter: 'agTextColumnFilter',
        valueFormatter: (p) => (p.value ? String(p.value) : '—'),
      },
      {
        colId: 'startingStock',
        headerName: 'Tồn đầu kỳ (ước lượng)',
        width: 200,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        headerTooltip:
          'Đã bán trong kỳ + Tồn hiện tại. Giả định không có nhập kho thêm giữa hai mốc ngày đã chọn.',
        valueGetter: (p) => this.startingStock(p.data as VariantReportRow),
      },
      {
        field: 'soldQuantity',
        headerName: 'Đã bán (kỳ)',
        width: 130,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        valueFormatter: (p) => String(p.value ?? 0),
      },
      {
        colId: 'soldPct',
        headerName: '% bán / tồn đầu',
        width: 150,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        headerTooltip: 'Đã bán ÷ Tồn đầu kỳ (ước lượng) × 100. Nếu tồn đầu = 0 thì hiển thị 0%.',
        valueGetter: (p) => this.soldPercent(p.data as VariantReportRow),
        valueFormatter: (p) => `${p.value ?? 0}%`,
      },
      {
        field: 'revenue',
        headerName: 'Doanh thu (trong kỳ)',
        width: 190,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        headerTooltip:
          'Chỉ cộng từ đơn PAID trong khoảng ngày; không tính đơn hủy / từ chối / hoàn đã đóng (theo backend).',
        valueFormatter: (p) => this.formatVnd(p.value as number),
      },
      {
        field: 'currentStock',
        headerName: 'Tồn hiện tại',
        width: 130,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        valueFormatter: (p) => String(p.value ?? 0),
      },
    ];
  }

  private applyDayRange(days: number): void {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    this.rangeStart.set(start.toISOString().split('T')[0]);
    this.rangeEnd.set(end.toISOString().split('T')[0]);
  }

  async refresh(): Promise<void> {
    const s = this.rangeStart();
    const e = this.rangeEnd();
    const data = await firstValueFrom(this.api.getSalesReport(s, e));
    this.report.set(data);
    const debt = await firstValueFrom(this.api.getDebtReport(s, e));
    this.debtRows.set(debt || []);
    const variants = await firstValueFrom(this.api.getVariantReport(s, e));
    this.variantRows.set(variants?.items || []);
  }

  setRange(type: '7days' | '30days'): void {
    this.applyDayRange(type === '7days' ? 7 : 30);
    void this.refresh();
  }

  startingStock(v: VariantReportRow | undefined): number {
    if (!v) return 0;
    const sold = v.soldQuantity ?? 0;
    const current = v.currentStock ?? 0;
    return sold + current;
  }

  soldPercent(v: VariantReportRow | undefined): number {
    if (!v) return 0;
    const start = this.startingStock(v);
    if (start <= 0) return 0;
    const sold = v.soldQuantity ?? 0;
    return Math.round((sold / start) * 100);
  }

  debtPaymentLabel(d: DebtOrderReportRow | undefined): string {
    if (!d) return '—';
    const ps = (d.paymentStatus || '').toUpperCase();
    if (ps === 'PAID') return 'Đã xác nhận thu';
    if (ps === 'AWAITING_CONFIRMATION') return 'Chờ xác nhận (khách đã báo CK)';
    if (ps === 'PENDING') return 'Chưa báo trả';
    return d.paymentStatus || '—';
  }

  isDebtAwaitingConfirm(d: DebtOrderReportRow): boolean {
    return (d.paymentStatus || '').toUpperCase() === 'AWAITING_CONFIRMATION';
  }

  isDebtPaid(d: DebtOrderReportRow): boolean {
    return (d.paymentStatus || '').toUpperCase() === 'PAID';
  }

  /** Điều hướng sang Quản lý đơn và mở popup chi tiết (query `orderId`). */
  goToOrder(orderId: number): void {
    void this.router.navigate(['/admin', 'orders'], { queryParams: { orderId } });
  }

  private renderDailyPaidOrdersCell(
    p: ICellRendererParams<SalesReport['revenueByDate'][number]>,
  ): HTMLElement | string {
    const orders = p.data?.paidOrders;
    if (orders?.length) {
      const wrap = document.createElement('div');
      wrap.className = 'daily-paid-orders-cell';
      for (const line of orders) {
        const row = document.createElement('div');
        row.className = 'daily-paid-order-row';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'daily-paid-order-link';
        btn.textContent = `#${line.orderId} · ${line.customerLabel} · ${this.formatVnd(line.amount)}`;
        btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          this.goToOrder(line.orderId);
        });
        row.appendChild(btn);
        wrap.appendChild(row);
      }
      return wrap;
    }
    const summary = p.data?.paidOrdersSummary;
    if (summary) {
      const div = document.createElement('div');
      div.className = 'daily-paid-orders-fallback';
      div.textContent = summary;
      return div;
    }
    return '—';
  }

  private formatVnd(n: number | null | undefined): string {
    if (n == null || Number.isNaN(Number(n))) return '—';
    return `${new Intl.NumberFormat('vi-VN').format(Number(n))} đ`;
  }

  private formatNumber0(n: number): string {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n);
  }

  private formatDateCell(iso: string | undefined): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return iso;
    }
  }

  /** Chuỗi yyyy-MM-dd → hiển thị lịch Việt (có thứ). */
  private formatYmdToVi(ymd: string | undefined): string {
    if (!ymd) return '—';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
    if (!m) return ymd;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    if (Number.isNaN(dt.getTime())) return ymd;
    return dt.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
