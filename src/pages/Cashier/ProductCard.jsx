import React from 'react';
import { Plus, Check, Ban } from 'lucide-react';
import { formatIDR } from '../../utils/currency';
import { Badge } from '../../components/common/Badge';
import { handleImageError } from '../../utils/imageFallback';

export const ProductCard = ({ product, onAddToCart, inCartQty = 0 }) => {
  const isAvailable = product.isAvailable;
  const productName = product.nama || product.name;
  const productPrice = product.harga || product.price;
  const productImage = product.gambar || product.image;
  const productDesc = product.deskripsi || product.description;

  return (
    <div
      onClick={() => isAvailable && onAddToCart(product)}
      className={`
        group relative flex flex-col justify-between bg-white rounded-xl sm:rounded-2xl border transition-all duration-200 select-none overflow-hidden
        ${
          isAvailable
            ? 'hover:shadow-lg hover:border-puko-400 hover:-translate-y-1 cursor-pointer active:scale-[0.99] border-slate-200/80 shadow-soft'
            : 'opacity-60 bg-slate-50 border-dashed border-slate-300 cursor-not-allowed'
        }
      `}
    >
      <div>
        {/* Product Image Container */}
        <div className="relative w-full h-32 sm:h-44 bg-slate-100 overflow-hidden">
          {productImage ? (
            <img
              src={productImage}
              alt={productName}
              className={`w-full h-full object-cover transition-transform duration-500 ${
                isAvailable ? 'group-hover:scale-105' : 'grayscale'
              }`}
              loading="lazy"
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-puko-500 to-emerald-700 flex items-center justify-center text-white text-3xl">
              🥑
            </div>
          )}

          {/* Gradient Overlay for contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

          {/* Floating Badges on Image */}
          <div className="absolute top-2 left-2 right-2 sm:top-2.5 sm:left-2.5 sm:right-2.5 flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-black/50 text-white backdrop-blur-md truncate max-w-[65%] sm:max-w-none">
              {product.category || 'Alpukat'}
            </span>

            {product.badge && isAvailable && (
              <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-amber-400 text-slate-950 shadow-sm shrink-0">
                {product.badge}
              </span>
            )}

            {!isAvailable && (
              <Badge variant="danger" size="sm" dot>
                Habis
              </Badge>
            )}
          </div>

          {/* In-cart indicator badge */}
          {inCartQty > 0 && (
            <div className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 bg-puko-600 text-white font-extrabold text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl shadow-lg flex items-center gap-1 sm:gap-1.5 backdrop-blur-sm border border-white/20">
              <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>
                {inCartQty}{' '}
                <span className="hidden sm:inline">di Keranjang</span>
              </span>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="p-2.5 sm:p-4">
          <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm md:text-base leading-snug group-hover:text-puko-700 transition-colors line-clamp-1">
            {productName}
          </h4>
          <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1 sm:line-clamp-2 leading-snug sm:leading-relaxed mt-0.5 sm:mt-1 min-h-[1rem] sm:min-h-[2rem]">
            {productDesc}
          </p>
        </div>
      </div>

      {/* Price & Action Button Footer */}
      <div className="px-2.5 sm:px-4 pb-2.5 sm:pb-4 pt-1.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
        <div className="min-w-0">
          <span className="text-[9px] sm:text-[10px] font-semibold uppercase text-slate-400 block leading-tight">
            Harga
          </span>
          <span className="font-extrabold text-puko-800 text-xs sm:text-base md:text-lg block truncate">
            {formatIDR(productPrice)}
          </span>
        </div>

        {isAvailable ? (
          <button
            type="button"
            className="p-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-puko-50 text-puko-700 font-bold text-xs flex items-center justify-center gap-1 group-hover:bg-puko-600 group-hover:text-white transition-all duration-200 shadow-sm shrink-0"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Tambah</span>
          </button>
        ) : (
          <span className="text-slate-400 text-[10px] sm:text-xs flex items-center gap-1 font-medium shrink-0">
            <Ban className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Habis
          </span>
        )}
      </div>
    </div>
  );
};
