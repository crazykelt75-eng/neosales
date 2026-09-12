'use client';

import React, { useMemo, useState } from 'react';
import { Headphones, Ruler, X } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Modal } from '@/components/ui/Modal';
import { formatBWP } from '@/lib/format';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { getProductTeaser } from '@/lib/product';
import { buildSupportLink } from '@/lib/whatsapp';

const TITLE_ID = 'saved-items-title';

export type StorefrontDrawerTab = 'bag' | 'saved';

/**
 * Side panel listing items the customer saved for later, with a direct route
 * back into the variant picker.
 */
export function SavedItemsDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { products, savedProductIds, toggleSaved, openProduct } = useStore();

  const savedProducts = useMemo(
    () => savedProductIds.map((id) => products.find((product) => product.id === id)).filter(Boolean),
    [products, savedProductIds]
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy={TITLE_ID} maxWidth="sm" presentation="sheet">
      <div className="flex max-h-[85vh] flex-col">
        <header className="border-b border-white/10 bg-[#0a0c13]/90 px-5 py-4">
          <h2 id={TITLE_ID} className="pr-10 text-base font-extrabold text-white">
            Saved for later
          </h2>
          <p className="mt-0.5 text-xs text-neutral-400">
            {savedProducts.length === 0
              ? 'Nothing saved yet'
              : `${savedProducts.length} piece${savedProducts.length === 1 ? '' : 's'} you are thinking about`}
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {savedProducts.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-bold text-white">No saved items</p>
              <p className="mx-auto mt-1.5 max-w-[260px] text-xs leading-relaxed text-neutral-400">
                Tap <strong className="text-neutral-200">Save</strong> on any product to keep it here while you decide —
                it stays on this device.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {savedProducts.map((product) => {
                if (!product) return null;

                const price = Math.min(...product.variants.map((variant) => variant.priceBWP), product.basePriceBWP);
                const soldOut = product.variants.every((variant) => variant.stockQuantity === 0);

                return (
                  <li
                    key={product.id}
                    className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <img
                      src={getOptimizedImageUrl(product.imageUrls[0], 200)}
                      alt=""
                      width={68}
                      height={84}
                      loading="lazy"
                      decoding="async"
                      className="h-[84px] w-[68px] flex-shrink-0 rounded-xl border border-white/10 object-cover"
                    />

                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-white" title={product.title}>
                            {product.title}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-2xs text-neutral-400">
                            {getProductTeaser(product)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleSaved(product.id)}
                          aria-label={`Remove ${product.title} from saved items`}
                          className="-mr-1 -mt-1 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
                        >
                          <X size={14} aria-hidden="true" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-black text-white" data-price>
                          {formatBWP(price)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            openProduct(product);
                          }}
                          className="rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-2xs font-bold uppercase tracking-wide text-neutral-100 transition-colors hover:border-orangeMoney/50 hover:text-white"
                        >
                          {soldOut ? 'View' : 'Choose option'}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="border-t border-white/10 bg-[#0a0c13]/95 px-5 py-4">
          <a
            href={buildSupportLink('I am deciding between a few pieces — can you help?')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-whatsapp/40 bg-whatsapp/10 text-xs font-bold text-whatsapp transition-colors hover:bg-whatsapp/20 focus-visible:outline-2 focus-visible:outline-whatsapp"
          >
            <Headphones size={15} aria-hidden="true" />
            Need help deciding? WhatsApp us
          </a>
        </footer>
      </div>
    </Modal>
  );
}

/**
 * Apparel sizing reference. Requests for this were a steady source of DMs and
 * exchanges, so the measurements are in centimetres with a familiar comparison.
 */
export function SizeGuideModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');

  const convert = (cm: number) => (unit === 'cm' ? `${cm}` : `${(cm / 2.54).toFixed(1)}`);

  const tops = [
    { size: 'S', chest: 104, length: 70, shoulder: 48 },
    { size: 'M', chest: 110, length: 72, shoulder: 50 },
    { size: 'L', chest: 116, length: 74, shoulder: 52 },
    { size: 'XL', chest: 122, length: 76, shoulder: 54 },
  ];

  const bottoms = [
    { size: 'S', waist: 66, hip: 96, length: 100 },
    { size: 'M', waist: 70, hip: 100, length: 102 },
    { size: 'L', waist: 74, hip: 104, length: 104 },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="size-guide-title" maxWidth="md" presentation="sheet">
      <div className="flex max-h-[88vh] flex-col">
        <header className="border-b border-white/10 bg-[#0a0c13]/90 px-5 py-4">
          <h2 id="size-guide-title" className="flex items-center gap-2 pr-10 text-base font-extrabold text-white">
            <Ruler size={18} className="text-amber-300" aria-hidden="true" />
            Size guide
          </h2>
          <p className="mt-0.5 text-xs text-neutral-400">
            Flat measurements in {unit === 'cm' ? 'centimetres' : 'inches'}. Our linen is cut oversized — if you want a
            closer fit, go one size down.
          </p>

          <div className="mt-3 flex items-center gap-1.5" role="group" aria-label="Measurement unit">
            {(['cm', 'in'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setUnit(option)}
                aria-pressed={unit === option}
                className={`rounded-xl border px-3 py-1.5 text-2xs font-bold uppercase tracking-wide transition-colors ${
                  unit === option
                    ? 'border-orangeMoney/50 bg-orangeMoney/15 text-white'
                    : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:text-white'
                }`}
              >
                {option === 'cm' ? 'Centimetres' : 'Inches'}
              </button>
            ))}
          </div>
        </header>

        <div className="space-y-5 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">Shirts &amp; tops</h3>
            <div className="mt-2.5 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-xs">
                <caption className="sr-only">Chest, length and shoulder measurements for shirts and tops</caption>
                <thead>
                  <tr className="border-b border-white/10 text-2xs uppercase tracking-wide text-neutral-400">
                    <th scope="col" className="py-2 pr-3 font-bold">Size</th>
                    <th scope="col" className="py-2 pr-3 text-right font-bold">Chest</th>
                    <th scope="col" className="py-2 pr-3 text-right font-bold">Length</th>
                    <th scope="col" className="py-2 text-right font-bold">Shoulder</th>
                  </tr>
                </thead>
                <tbody>
                  {tops.map((row) => (
                    <tr key={row.size} className="border-b border-white/[0.06] last:border-0">
                      <th scope="row" className="py-2.5 pr-3 text-left font-bold text-white">
                        {row.size}
                      </th>
                      <td className="py-2.5 pr-3 text-right font-mono text-neutral-200">{convert(row.chest)}</td>
                      <td className="py-2.5 pr-3 text-right font-mono text-neutral-200">{convert(row.length)}</td>
                      <td className="py-2.5 text-right font-mono text-neutral-200">{convert(row.shoulder)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
              Trousers &amp; palazzos
            </h3>
            <div className="mt-2.5 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-xs">
                <caption className="sr-only">Waist, hip and length measurements for trousers</caption>
                <thead>
                  <tr className="border-b border-white/10 text-2xs uppercase tracking-wide text-neutral-400">
                    <th scope="col" className="py-2 pr-3 font-bold">Size</th>
                    <th scope="col" className="py-2 pr-3 text-right font-bold">Waist</th>
                    <th scope="col" className="py-2 pr-3 text-right font-bold">Hip</th>
                    <th scope="col" className="py-2 text-right font-bold">Length</th>
                  </tr>
                </thead>
                <tbody>
                  {bottoms.map((row) => (
                    <tr key={row.size} className="border-b border-white/[0.06] last:border-0">
                      <th scope="row" className="py-2.5 pr-3 text-left font-bold text-white">
                        {row.size}
                      </th>
                      <td className="py-2.5 pr-3 text-right font-mono text-neutral-200">{convert(row.waist)}</td>
                      <td className="py-2.5 pr-3 text-right font-mono text-neutral-200">{convert(row.hip)}</td>
                      <td className="py-2.5 text-right font-mono text-neutral-200">{convert(row.length)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-2xs leading-relaxed text-neutral-300">
            <p className="font-bold text-white">How to measure</p>
            <p className="mt-1">
              Chest: around the fullest part, keeping the tape level. Waist: at your natural waistline, not where your
              trousers usually sit. Length: from the highest point of the shoulder straight down.
            </p>
            <p className="mt-2">
              Still unsure? Send us your usual size on WhatsApp and we will recommend the best fit — exchanges within 48
              hours are free at our Francistown pickup points.
            </p>
          </div>
        </div>

        <footer className="border-t border-white/10 bg-[#0a0c13]/95 px-5 py-4">
          <a
            href={buildSupportLink('I need help choosing a size.')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-whatsapp/40 bg-whatsapp/10 text-xs font-bold text-whatsapp transition-colors hover:bg-whatsapp/20 focus-visible:outline-2 focus-visible:outline-whatsapp"
          >
            <Headphones size={15} aria-hidden="true" />
            Ask us for a size recommendation
          </a>
        </footer>
      </div>
    </Modal>
  );
}
