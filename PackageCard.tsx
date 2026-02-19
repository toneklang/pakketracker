
import React from 'react';
import { Package, PackageStatus, Carrier } from '../types';

interface PackageCardProps {
  pkg: Package;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}

const CarrierBadge: React.FC<{ carrier: Carrier }> = ({ carrier }) => {
  const colors: Record<Carrier, string> = {
    [Carrier.POSTNORD]: 'bg-blue-100 text-blue-700',
    [Carrier.GLS]: 'bg-yellow-100 text-yellow-800',
    [Carrier.DAO]: 'bg-red-100 text-red-700',
    [Carrier.BRING]: 'bg-green-100 text-green-700',
    [Carrier.DHL]: 'bg-yellow-200 text-yellow-900',
    [Carrier.UPS]: 'bg-amber-800 text-white',
    [Carrier.FEDEX]: 'bg-purple-100 text-purple-700',
    [Carrier.OTHER]: 'bg-gray-100 text-gray-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[carrier]}`}>
      {carrier}
    </span>
  );
};

export const PackageCard: React.FC<PackageCardProps> = ({ pkg, onToggleStatus, onDelete }) => {
  const isPickedUp = pkg.status === PackageStatus.PICKED_UP;

  return (
    <div className={`relative bg-white rounded-2xl p-4 shadow-sm mb-4 transition-all duration-300 ${isPickedUp ? 'opacity-60 scale-[0.98]' : 'hover:shadow-md'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col gap-1">
          <CarrierBadge carrier={pkg.carrier} />
          <h3 className="text-lg font-bold text-gray-900 leading-tight">
            {pkg.sender || 'Unknown Sender'}
          </h3>
          <p className="text-xs text-gray-400 font-mono tracking-tighter">
            #{pkg.trackingNumber || 'No ID'}
          </p>
        </div>
        <button 
          onClick={() => onToggleStatus(pkg.id)}
          className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
            isPickedUp 
              ? 'bg-blue-500 border-blue-500 text-white' 
              : 'border-gray-200 text-transparent'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            pkg.status === PackageStatus.READY_FOR_PICKUP ? 'bg-orange-500 animate-pulse' : 
            pkg.status === PackageStatus.PICKED_UP ? 'bg-green-500' : 'bg-blue-400'
          }`} />
          <span className="text-sm font-medium text-gray-600">{pkg.status}</span>
        </div>
        <button 
          onClick={() => {
            if(confirm('Delete this package?')) onDelete(pkg.id);
          }}
          className="text-xs text-gray-300 hover:text-red-500 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
};
