'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudOff,
  Database,
  Download,
  FileSpreadsheet,
  HardDriveDownload,
  Package,
  RotateCcw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { StoreBackup } from '@/types';
import { Button } from '@/components/ui/Button';
import {
  buildBackup,
  buildCatalogCsv,
  buildOrdersCsv,
  downloadFile,
  parseBackup,
  serialiseBackup,
  timestampedFilename,
} from '@/lib/export';
import { formatRelativeTime } from '@/lib/format';
import { STORAGE_KEYS, readStorage, removeStorage, writeStorage } from '@/lib/storage';

interface BackupStamp {
  at: string;
  products: number;
  orders: number;
}

interface RestorePreview {
  backup: StoreBackup;
  warnings: string[];
  filename: string;
}

const BACKUP_STALE_DAYS = 7;

/** Export, restore and danger-zone tooling for the seller's local data. */
export function DataBackupPanel() {
  const { products, orders, importBackup, resetDemoData, isCloudSync } = useStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [stamp, setStamp] = useState<BackupStamp | null>(null);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  useEffect(() => {
    setStamp(readStorage<BackupStamp | null>(STORAGE_KEYS.lastBackup, null));
  }, []);

  const variantCount = useMemo(
    () => products.reduce((sum, product) => sum + product.variants.length, 0),
    [products]
  );

  const stockValueBWP = useMemo(
    () =>
      products.reduce(
        (sum, product) =>
          sum + product.variants.reduce((acc, variant) => acc + variant.priceBWP * variant.stockQuantity, 0),
        0
      ),
    [products]
  );

  /** Rough measure of how much the browser is currently holding for us. */
  const storageFootprintKb = useMemo(() => {
    const payload: unknown[] = [products, orders, readStorage<unknown[]>(STORAGE_KEYS.cart, [])];
    const bytes = payload.reduce<number>((sum, part) => sum + JSON.stringify(part).length, 0);
    return Math.max(1, Math.round(bytes / 1024));
  }, [products, orders]);

  const isBackupStale = useMemo(() => {
    if (!stamp) return true;
    const ageMs = Date.now() - new Date(stamp.at).getTime();
    return ageMs > BACKUP_STALE_DAYS * 24 * 60 * 60 * 1000;
  }, [stamp]);

  const recordBackup = (counts: { products: number; orders: number }) => {
    const next: BackupStamp = { at: new Date().toISOString(), ...counts };
    setStamp(next);
    writeStorage(STORAGE_KEYS.lastBackup, next);
  };

  const handleExportOrders = () => {
    downloadFile(
      timestampedFilename('neosales-orders', 'csv'),
      `\uFEFF${buildOrdersCsv(orders)}`,
      'text/csv'
    );
    recordBackup({ products: products.length, orders: orders.length });
  };

  const handleExportCatalog = () => {
    downloadFile(
      timestampedFilename('neosales-catalog', 'csv'),
      `\uFEFF${buildCatalogCsv(products)}`,
      'text/csv'
    );
    recordBackup({ products: products.length, orders: orders.length });
  };

  const handleExportBackup = () => {
    downloadFile(
      timestampedFilename('neosales-backup', 'json'),
      serialiseBackup(buildBackup(products, orders)),
      'application/json'
    );
    recordBackup({ products: products.length, orders: orders.length });
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRestoreError('');
    setPreview(null);

    try {
      const text = await file.text();
      const result = parseBackup(text);

      if (!result.ok) {
        setRestoreError(result.error);
        return;
      }

      setPreview({ backup: result.backup, warnings: result.warnings, filename: file.name });
    } catch {
      setRestoreError('That file could not be read. Try downloading it again and re-uploading.');
    } finally {
      // Allow re-selecting the same file after a failed attempt.
      event.target.value = '';
    }
  };

  const handleConfirmRestore = () => {
    if (!preview) return;
    importBackup(preview.backup);
    setPreview(null);
    setRestoreError('');
  };

  return (
    <section aria-label="Data backup and restore" className="space-y-4">
      {/* Health summary */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label="Catalog"
          value={`${products.length} products`}
          hint={`${variantCount} variants · ${Math.round(stockValueBWP).toLocaleString('en-BW')} P stock value`}
          icon={<Package size={17} aria-hidden="true" />}
        />
        <SummaryTile
          label="Orders on file"
          value={String(orders.length)}
          hint={`${orders.filter((order) => order.status !== 'cancelled').length} active · ${
            orders.filter((order) => order.status === 'cancelled').length
          } cancelled`}
          icon={<Database size={17} aria-hidden="true" />}
        />
        <SummaryTile
          label="Local storage used"
          value={`${storageFootprintKb} KB`}
          hint="Saved in this browser only — export regularly"
          icon={<HardDriveDownload size={17} aria-hidden="true" />}
        />
        <SummaryTile
          label="Cloud mirror"
          value={isCloudSync ? 'Supabase live' : 'Local only'}
          hint={
            isCloudSync
              ? 'Catalog and orders also sync to Supabase'
              : 'Set Supabase env vars for a second copy of your data'
          }
          icon={isCloudSync ? <Cloud size={17} aria-hidden="true" /> : <CloudOff size={17} aria-hidden="true" />}
        />
      </div>

      {/* Backup reminder */}
      <div
        className={`flex flex-col gap-2 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
          isBackupStale ? 'border-amber-500/30 bg-amber-500/[0.07]' : 'border-emerald-500/25 bg-emerald-500/[0.06]'
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${
              isBackupStale
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
            }`}
          >
            {isBackupStale ? (
              <AlertTriangle size={17} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={17} aria-hidden="true" />
            )}
          </span>

          <div>
            <p className="text-sm font-bold text-white">
              {stamp
                ? `Last backup ${formatRelativeTime(stamp.at)}${
                    isBackupStale ? ' — time for a fresh one' : ''
                  }`
                : 'No backup downloaded yet'}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-neutral-300">
              {stamp
                ? `Captured ${stamp.products} products and ${stamp.orders} orders. Keep the file in your Google Drive or email it to yourself.`
                : 'Your catalog, stock and orders live in this browser. Download a backup file so a cleared cache or a new phone never costs you your records.'}
            </p>
          </div>
        </div>

        <Button variant="primary" size="md" onClick={handleExportBackup} leftIcon={<Download size={16} />}>
          Download backup
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Exports */}
        <div className="rounded-2xl border border-white/10 bg-surface/70 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <FileSpreadsheet size={16} className="text-orangeMoney" aria-hidden="true" />
            Exports for Excel &amp; your accountant
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-300">
            Opens straight in Excel or Google Sheets. The orders ledger carries totals in Pula, the payment rail and the
            transaction reference — everything needed for a month-end reconciliation.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={handleExportOrders}
              leftIcon={<Download size={15} />}
            >
              Orders ledger ({orders.length})
            </Button>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={handleExportCatalog}
              leftIcon={<Download size={15} />}
            >
              Stock sheet ({variantCount} variants)
            </Button>
          </div>
        </div>

        {/* Restore */}
        <div className="rounded-2xl border border-white/10 bg-surface/70 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Upload size={16} className="text-emerald-300" aria-hidden="true" />
            Restore from a backup file
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-300">
            Moving to a new phone, or recovering after a cleared browser? Upload a NeoSales backup file and we will
            validate it before replacing anything.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileSelected}
            className="sr-only"
            id="backup-file-input"
          />

          <label
            htmlFor="backup-file-input"
            className="mt-4 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-4 text-sm font-bold text-neutral-100 transition-colors hover:border-orangeMoney/50 hover:bg-white/[0.1] focus-within:outline focus-within:outline-2 focus-within:outline-orangeMoney"
          >
            <Upload size={16} aria-hidden="true" />
            Choose a .json backup
          </label>

          {restoreError && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-2xs font-semibold leading-relaxed text-red-200">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
              {restoreError}
            </p>
          )}

          {preview && (
            <div className="mt-3 space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-3.5">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold text-emerald-100">
                  <ShieldCheck size={14} aria-hidden="true" />
                  Backup verified
                </p>
                <p className="mt-1 text-2xs leading-relaxed text-neutral-200">
                  <span className="font-semibold text-white">{preview.filename}</span> ·{' '}
                  {preview.backup.products.length} products · {preview.backup.orders.length} orders · exported{' '}
                  {formatRelativeTime(preview.backup.exportedAt)}
                </p>
              </div>

              {preview.warnings.length > 0 && (
                <ul className="space-y-1 text-2xs text-amber-100">
                  {preview.warnings.map((warning) => (
                    <li key={warning} className="flex items-start gap-1.5">
                      <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                      {warning}
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-2xs leading-relaxed text-amber-100">
                Restoring replaces your current catalog ({products.length} products) and orders ({orders.length}).
                Download a backup of the current state first if you are unsure.
              </p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" fullWidth onClick={handleConfirmRestore}>
                  Restore this backup
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-red-100">
          <RotateCcw size={16} aria-hidden="true" />
          Reset to demo data
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-300">
          Replaces the catalog, bag and orders with the original demo content. Use this on a fresh install or after a
          test — never on a live shop before exporting a backup.
        </p>

        {isConfirmingReset ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button variant="ghost" size="sm" onClick={() => setIsConfirmingReset(false)}>
              Keep my data
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                resetDemoData();
                removeStorage(STORAGE_KEYS.lastBackup);
                setStamp(null);
                setIsConfirmingReset(false);
              }}
            >
              Yes, wipe and reset
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setIsConfirmingReset(true)}
            leftIcon={<RotateCcw size={14} />}
          >
            Reset store data
          </Button>
        )}
      </div>
    </section>
  );
}

interface SummaryTileProps {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}

function SummaryTile({ label, value, hint, icon }: SummaryTileProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">{label}</p>
          <p className="mt-1.5 font-mono text-lg font-black text-white">{value}</p>
        </div>
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-neutral-200">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-2xs leading-relaxed text-neutral-400">{hint}</p>
    </div>
  );
}
