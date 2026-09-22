import React from 'react';
import { Search, Sparkles, Filter, ShoppingBag } from 'lucide-react';
import { useProducts } from '../../context/ProductContext';
import { useCart } from '../../context/CartContext';
import { ProductCard } from './ProductCard';
import { CartPanel } from './CartPanel';
import { Input } from '../../components/common/Input';

export const CashierPage = () => {
  const {
    filteredProducts,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    isLoading,
  } = useProducts();

  const { items, addItem, totalItemsCount } = useCart();

  // Helper to get quantity of an item in cart
  const getItemCartQty = (productId) => {
    const item = items.find((i) => i.id === productId);
    return item ? item.qty : 0;
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Left Column: Product Catalog */}
      <div
        className={`flex-1 flex flex-col min-w-0 space-y-4 ${
          totalItemsCount > 0 ? 'pb-24 lg:pb-0' : ''
        }`}
      >
        {/* Top Filter & Search Bar */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-soft space-y-2.5 sm:space-y-3">
          {/* Search input */}
          <Input
            placeholder="Cari alpukat kocok, topping, atau minuman..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={Search}
            className="text-xs sm:text-sm"
          />

          {/* Categories Pill Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`
                  px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 select-none
                  ${
                    selectedCategory === cat
                      ? 'bg-puko-600 text-white shadow-sm shadow-puko-800/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }
                `}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-2xl h-52 sm:h-64 p-3 sm:p-4 animate-pulse border border-slate-200 flex flex-col justify-between"
                >
                  <div className="w-full h-24 sm:h-28 bg-slate-200 rounded-xl mb-2 sm:mb-3" />
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="h-3.5 sm:h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                  <div className="h-7 sm:h-8 bg-slate-200 rounded-lg mt-2 sm:mt-4" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <Sparkles className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <h4 className="font-bold text-slate-700 text-base">
                Tidak ada menu yang cocok
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Coba kata kunci lain atau pilih kategori berbeda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={addItem}
                  inCartQty={getItemCartQty(product.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Active Cart / POS Bill Panel (Desktop: Sidebar, Mobile: Floating triggers inside CartPanel) */}
      <div className="lg:w-[380px] xl:w-[420px] shrink-0 lg:h-[calc(100vh-6.5rem)] lg:sticky lg:top-20">
        <CartPanel />
      </div>
    </div>
  );
};
