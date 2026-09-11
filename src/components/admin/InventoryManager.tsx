'use client';

import React, { useState, useEffect } from 'react';
import { Plus, AlertTriangle, Check, Search, Package, Sparkles, X } from 'lucide-react';
import { Product, ProductCategory, ProductVariant } from '@/types';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export function InventoryManager() {
  const { products, addProduct, updateVariantStock } = useStore();
  const { showToast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Quick-Add Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProductCategory>('perfumes');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isNewArrival, setIsNewArrival] = useState(true);
  const [variantsList, setVariantsList] = useState<
    { label: string; price: string; quantity: string }[]
  >([
    { label: '30ml', price: '280', quantity: '10' },
    { label: '50ml', price: '420', quantity: '5' },
  ]);

  // Escape key for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAddModalOpen(false);
    };
    if (isAddModalOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen]);

  const handleCategoryChange = (cat: ProductCategory) => {
    setCategory(cat);
    if (cat === 'perfumes') {
      setVariantsList([
        { label: '30ml', price: '280', quantity: '10' },
        { label: '50ml', price: '420', quantity: '5' },
      ]);
    } else if (cat === 'clothes') {
      setVariantsList([
        { label: 'Size S', price: '350', quantity: '5' },
        { label: 'Size M', price: '350', quantity: '8' },
        { label: 'Size L', price: '350', quantity: '4' },
      ]);
    } else {
      setVariantsList([{ label: 'Standard', price: '190', quantity: '10' }]);
    }
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !basePrice) return;

    const parsedBasePrice = parseFloat(basePrice) || 200;
    const slug =
      title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);

    const generatedVariants: ProductVariant[] = variantsList.map((v, idx) => {
      const volMatch = v.label.match(/(\d+)\s*ml/i);
      const sizeMatch = v.label.match(/size\s*([a-z0-9]+)/i);

      return {
        id: `var-${Date.now()}-${idx}`,
        productId: '',
        sku: `${slug.toUpperCase()}-${idx + 1}`,
        volumeMl: volMatch ? parseInt(volMatch[1], 10) : undefined,
        size: sizeMatch ? sizeMatch[1].toUpperCase() : undefined,
        scentProfile: category === 'perfumes' ? 'Curated Niche Extract' : undefined,
        priceBWP: parseFloat(v.price) || parsedBasePrice,
        stockQuantity: parseInt(v.quantity, 10) || 0,
        lowStockThreshold: 2,
      };
    });

    addProduct({
      title: title.trim(),
      slug,
      category,
      description: description.trim() || 'Imported luxury quality.',
      basePriceBWP: parsedBasePrice,
      isActive: true,
      isNewArrival,
      imageUrls: [
        imageUrl.trim() ||
          (category === 'perfumes'
            ? 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80'),
      ],
      variants: generatedVariants,
    });

    showToast({
      type: 'success',
      title: 'Product Published',
      description: `"${title.trim()}" has been published with ${generatedVariants.length} variants.`,
    });

    // Reset Form
    setTitle('');
    setDescription('');
    setBasePrice('');
    setImageUrl('');
    setIsAddModalOpen(false);
  };

  const handleStockUpdate = (productId: string, variantId: string, qty: number) => {
    updateVariantStock(productId, variantId, qty);
  };

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-soft">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-3 text-neutral-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search catalog inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search catalog inventory"
            className="w-full pl-10 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900 min-h-[40px]"
          />
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto"
          leftIcon={<Plus size={16} aria-hidden="true" />}
        >
          Quick-Add New Arrival
        </Button>
      </div>

      {/* Inventory Table Container */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/90 overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-700" aria-label="Product Inventory Table">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-black text-neutral-500 uppercase tracking-wider">
              <tr>
                <th scope="col" className="p-4">Product Details</th>
                <th scope="col" className="p-4">Category</th>
                <th scope="col" className="p-4">Base Price</th>
                <th scope="col" className="p-4">Variant Stock (Live Editable)</th>
                <th scope="col" className="p-4 text-right">Catalog Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {filteredProducts.map((product) => {
                const totalStock = product.variants.reduce((acc, v) => acc + v.stockQuantity, 0);

                return (
                  <tr key={product.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <img
                        src={product.imageUrls[0]}
                        alt=""
                        aria-hidden="true"
                        className="w-12 h-12 rounded-xl object-cover bg-neutral-100 flex-shrink-0 border border-neutral-200"
                      />
                      <div>
                        <p className="font-extrabold text-neutral-900 text-xs sm:text-sm">{product.title}</p>
                        <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                          {product.description}
                        </p>
                      </div>
                    </td>

                    <td className="p-4">
                      <Badge variant="category">{product.category}</Badge>
                    </td>

                    <td className="p-4 font-black text-neutral-950 font-mono text-sm">
                      P{product.basePriceBWP}
                    </td>

                    {/* Variants and In-line Stock Editor */}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {product.variants.map((v) => (
                          <div
                            key={v.id}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-[11px] ${
                              v.stockQuantity === 0
                                ? 'bg-red-50 border-red-200 text-red-700 font-bold'
                                : v.stockQuantity <= 2
                                ? 'bg-amber-50 border-amber-200 text-amber-900 font-semibold'
                                : 'bg-neutral-50 border-neutral-200 text-neutral-800'
                            }`}
                          >
                            <span className="font-bold">
                              {v.volumeMl ? `${v.volumeMl}ml` : v.size ? `Size ${v.size}` : v.color || 'Var'}
                            </span>
                            <span className="text-neutral-400" aria-hidden="true">|</span>
                            <div className="flex items-center gap-1.5">
                              <label htmlFor={`stock-${v.id}`} className="text-[10px] text-neutral-500 uppercase font-mono">
                                Qty:
                              </label>
                              <input
                                id={`stock-${v.id}`}
                                type="number"
                                min="0"
                                value={v.stockQuantity}
                                onChange={(e) =>
                                  handleStockUpdate(
                                    product.id,
                                    v.id,
                                    parseInt(e.target.value, 10) || 0
                                  )
                                }
                                aria-label={`Stock quantity for ${v.volumeMl ? `${v.volumeMl}ml` : v.size || 'variant'}`}
                                className="w-14 px-1.5 py-0.5 bg-white border border-neutral-300 rounded-lg font-mono font-black text-center text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="p-4 text-right">
                      {totalStock === 0 ? (
                        <Badge variant="soldOut">Sold Out</Badge>
                      ) : totalStock <= 3 ? (
                        <Badge variant="lowStock" pulse>
                          Low Stock ({totalStock})
                        </Badge>
                      ) : (
                        <Badge variant="success">{totalStock} Available</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick-Add Product Modal */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-modal-heading"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 overflow-hidden shadow-elevated space-y-4 max-h-[90vh] overflow-y-auto animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 id="add-modal-heading" className="font-extrabold text-base sm:text-lg text-neutral-900">
                Quick-Add Product or Stock Batch
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
                aria-label="Close add product modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 text-left">
              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1">
                  Product Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Delina Rose Extrait or Bohemian Linen Crop"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-800 block mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as ProductCategory)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-950"
                  >
                    <option value="perfumes">Perfumes</option>
                    <option value="clothes">Clothes</option>
                    <option value="accessories">Accessories</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-800 block mb-1">
                    Base Price (BWP)
                  </label>
                  <input
                    type="number"
                    required
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="e.g. 350"
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-950"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1">
                  Image URL (Unsplash or Supabase)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key scents, fabrics, fit notes..."
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-950"
                />
              </div>

              {/* Dynamic Variants Setup */}
              <div className="space-y-2.5 pt-2 border-t border-neutral-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-extrabold text-neutral-900">
                    Variants & Initial Stock
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setVariantsList([
                        ...variantsList,
                        { label: 'New Option', price: basePrice || '280', quantity: '5' },
                      ])
                    }
                    className="text-xs font-bold text-orangeMoney hover:underline"
                  >
                    + Add Option
                  </button>
                </div>

                <div className="space-y-2">
                  {variantsList.map((v, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={v.label}
                        onChange={(e) => {
                          const updated = [...variantsList];
                          updated[i].label = e.target.value;
                          setVariantsList(updated);
                        }}
                        placeholder="Option label"
                        className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs"
                      />
                      <input
                        type="number"
                        value={v.price}
                        onChange={(e) => {
                          const updated = [...variantsList];
                          updated[i].price = e.target.value;
                          setVariantsList(updated);
                        }}
                        placeholder="Price BWP"
                        className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs"
                      />
                      <input
                        type="number"
                        value={v.quantity}
                        onChange={(e) => {
                          const updated = [...variantsList];
                          updated[i].quantity = e.target.value;
                          setVariantsList(updated);
                        }}
                        placeholder="Qty"
                        className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="flex-1"
                >
                  Publish to Catalog
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
