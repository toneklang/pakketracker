
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// Shim for process.env to prevent ReferenceError in pure browser environments
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

// --- TYPES ---
enum Carrier {
  POSTNORD = 'PostNord',
  GLS = 'GLS',
  DAO = 'DAO',
  BRING = 'Bring',
  DHL = 'DHL',
  UPS = 'UPS',
  FEDEX = 'FedEx',
  OTHER = 'Other'
}

enum PackageStatus {
  IN_TRANSIT = 'In Transit',
  READY_FOR_PICKUP = 'Ready for Pickup',
  PICKED_UP = 'Picked Up'
}

interface Package {
  id: string;
  trackingNumber: string;
  carrier: Carrier;
  sender: string;
  status: PackageStatus;
  receivedDate: string;
  originalText: string;
  lastUpdated: string;
}

interface ParseResult {
  trackingNumber: string | null;
  carrier: Carrier;
  sender: string | null;
  status: PackageStatus;
}

// --- SERVICES ---
const SYSTEM_PROMPT = `Extract package tracking information from this Danish message (SMS or Email). 
Identify the carrier (PostNord, GLS, DAO, Bring, etc.), the tracking number, the sender name (if available), and whether the package is currently ready for pickup or still in transit.
Common Danish terms: "klar til afhentning" (Ready for Pickup), "pakken er på vej" (In Transit).`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    trackingNumber: { type: Type.STRING, description: "The tracking ID/barcode number." },
    carrier: { 
      type: Type.STRING, 
      enum: Object.values(Carrier),
      description: "The shipping company." 
    },
    sender: { type: Type.STRING, description: "Who the package is from." },
    status: { 
      type: Type.STRING, 
      enum: Object.values(PackageStatus),
      description: "Current delivery state based on the text." 
    }
  },
  required: ["carrier", "status"]
};

async function parsePackageText(text: string): Promise<ParseResult | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${SYSTEM_PROMPT}\n\nMessage:\n"${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });
    if (!response.text) return null;
    return JSON.parse(response.text.trim()) as ParseResult;
  } catch (error) {
    console.error("Error parsing text:", error);
    return null;
  }
}

async function parsePackageImage(base64Data: string, mimeType: string): Promise<ParseResult | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ inlineData: { data: base64Data, mimeType } }, { text: SYSTEM_PROMPT }],
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });
    if (!response.text) return null;
    return JSON.parse(response.text.trim()) as ParseResult;
  } catch (error) {
    console.error("Error parsing image:", error);
    return null;
  }
}

// Mocking the loginToOutlook for UI demo
const loginToOutlook = (): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve("MOCK_TOKEN"), 1000);
  });
};

// --- COMPONENTS ---
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

const PackageCard: React.FC<{ pkg: Package, onToggleStatus: (id: string) => void, onDelete: (id: string) => void }> = ({ pkg, onToggleStatus, onDelete }) => {
  const isPickedUp = pkg.status === PackageStatus.PICKED_UP;
  return (
    <div className={`relative bg-white rounded-2xl p-4 shadow-sm mb-4 transition-all duration-300 ${isPickedUp ? 'opacity-60 scale-[0.98]' : 'hover:shadow-md'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col gap-1">
          <CarrierBadge carrier={pkg.carrier} />
          <h3 className="text-lg font-bold text-gray-900 leading-tight">{pkg.sender || 'Ukendt afsender'}</h3>
          <p className="text-xs text-gray-400 font-mono tracking-tighter">#{pkg.trackingNumber || 'Intet ID'}</p>
        </div>
        <button 
          onClick={() => onToggleStatus(pkg.id)}
          className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${isPickedUp ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-200 text-transparent'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
        </button>
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${pkg.status === PackageStatus.READY_FOR_PICKUP ? 'bg-orange-500 animate-pulse' : isPickedUp ? 'bg-green-500' : 'bg-blue-400'}`} />
          <span className="text-sm font-medium text-gray-600">{pkg.status}</span>
        </div>
        <button onClick={() => confirm('Slet pakke?') && onDelete(pkg.id)} className="text-xs text-gray-300 hover:text-red-500">Fjern</button>
      </div>
    </div>
  );
};

// --- MAIN APP ---
const App: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'settings' | 'map'>('current');
  const [showInput, setShowInput] = useState(false);
  const [outlookToken, setOutlookToken] = useState<string | null>(localStorage.getItem('outlook-token'));
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('last-sync-time'));
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('pakke-tracker-data');
    if (saved) try { setPackages(JSON.parse(saved)); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    localStorage.setItem('pakke-tracker-data', JSON.stringify(packages));
  }, [packages]);

  const processParsedResult = (result: ParseResult, sourceText: string) => {
    if (result && result.trackingNumber) {
      const existingIndex = packages.findIndex(p => p.trackingNumber === result.trackingNumber);
      if (existingIndex > -1) {
        const updated = [...packages];
        updated[existingIndex] = { ...updated[existingIndex], status: result.status, sender: result.sender || updated[existingIndex].sender, lastUpdated: new Date().toISOString() };
        setPackages(updated);
      } else {
        const newPkg: Package = {
          id: Math.random().toString(36).substr(2, 9),
          trackingNumber: result.trackingNumber,
          carrier: result.carrier,
          sender: result.sender || 'Leverandør',
          status: result.status,
          receivedDate: new Date().toISOString(),
          originalText: sourceText,
          lastUpdated: new Date().toISOString(),
        };
        setPackages(prev => [newPkg, ...prev]);
      }
      return true;
    }
    return false;
  };

  const handleSyncOutlook = async () => {
    setIsProcessing(true);
    try {
      const token = await loginToOutlook();
      setOutlookToken(token);
      localStorage.setItem('outlook-token', token);
      const syncTime = new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
      setLastSync(syncTime);
      localStorage.setItem('last-sync-time', syncTime);
      alert("Outlook synkroniseret (Simulering)");
    } catch (e) {
      console.error(e);
      alert("Outlook synkronisering fejlede.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredPackages = packages.filter(p => activeTab === 'current' ? p.status !== PackageStatus.PICKED_UP : p.status === PackageStatus.PICKED_UP);

  return (
    <div className="min-h-screen max-w-md mx-auto bg-[#f2f2f7] flex flex-col relative shadow-2xl overflow-hidden pb-20">
      <header className="pt-12 px-6 pb-4 bg-white/80 ios-blur sticky top-0 z-40 border-b border-gray-100">
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xs font-bold text-blue-500 uppercase tracking-widest">
                {activeTab === 'settings' ? 'Indstillinger' : new Date().toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric', month: 'short' })}
              </h2>
              {lastSync && activeTab !== 'settings' && (
                <span className="text-[10px] text-gray-400 font-medium tracking-tight">• {lastSync}</span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {activeTab === 'settings' ? 'Profil' : activeTab === 'map' ? 'Find Pakker' : 'Pakker'}
            </h1>
          </div>
          {activeTab !== 'settings' && activeTab !== 'map' && (
            <div className="flex gap-2">
              <button onClick={handleSyncOutlook} className="w-10 h-10 bg-gray-100 text-blue-500 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all">
                <svg className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
              <button onClick={() => setShowInput(!showInput)} className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform">
                <svg className={`w-6 h-6 transition-transform ${showInput ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {activeTab === 'settings' ? (
          <div className="p-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
              <p className="text-sm text-gray-500 mb-4">Alle data gemmes lokalt på din enhed.</p>
              <button 
                onClick={() => confirm('Slet alt?') && setPackages([])}
                className="w-full py-3 bg-red-50 text-red-500 font-bold rounded-xl"
              >
                Slet alt data
              </button>
            </div>
          </div>
        ) : activeTab === 'map' ? (
          <div className="p-10 text-center text-gray-400">
            <p>Kort-visning kommer snart...</p>
          </div>
        ) : (
          <div className="px-6 pt-6">
            {showInput && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 mb-6 animate-in slide-in-from-top-4">
                <div className="flex justify-between mb-4">
                  <h3 className="text-sm font-bold">Ny pakke</h3>
                  <button onClick={() => fileInputRef.current?.click()} className="text-blue-500 text-[11px] font-bold">SCAN BILLED</button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if(!file) return;
                    setIsProcessing(true);
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      const res = await parsePackageImage((ev.target?.result as string).split(',')[1], file.type);
                      if (res && processParsedResult(res, 'Screenshot')) setShowInput(false);
                      setIsProcessing(false);
                    };
                    reader.readAsDataURL(file);
                  }} />
                </div>
                <textarea 
                  value={inputText} onChange={(e) => setInputText(e.target.value)}
                  className="w-full h-20 p-3 bg-gray-50 border rounded-xl text-sm mb-3" placeholder="Indsæt tekst..."
                />
                <button 
                  onClick={async () => {
                    setIsProcessing(true);
                    const res = await parsePackageText(inputText);
                    if(res && processParsedResult(res, inputText)) { setInputText(''); setShowInput(false); }
                    setIsProcessing(false);
                  }}
                  disabled={isProcessing || !inputText.trim()}
                  className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {isProcessing ? 'Analyserer...' : 'Tilføj pakke'}
                </button>
              </div>
            )}
            <div className="flex p-1 bg-gray-200/80 rounded-xl mb-6">
              <button onClick={() => setActiveTab('current')} className={`flex-1 py-1.5 text-sm font-semibold rounded-lg ${activeTab === 'current' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Aktive ({packages.filter(p => p.status !== PackageStatus.PICKED_UP).length})</button>
              <button onClick={() => setActiveTab('history')} className={`flex-1 py-1.5 text-sm font-semibold rounded-lg ${activeTab === 'history' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Historik</button>
            </div>
            {filteredPackages.map(pkg => (
              <PackageCard key={pkg.id} pkg={pkg} onToggleStatus={(id) => setPackages(prev => prev.map(p => p.id === id ? {...p, status: p.status === PackageStatus.PICKED_UP ? PackageStatus.READY_FOR_PICKUP : PackageStatus.PICKED_UP} : p))} onDelete={(id) => setPackages(prev => prev.filter(p => p.id !== id))} />
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-20 bg-white/90 ios-blur border-t px-10 flex items-center justify-between z-50 safe-area-bottom">
        <button onClick={() => setActiveTab('current')} className={`flex flex-col items-center ${activeTab === 'current' || activeTab === 'history' ? 'text-blue-500' : 'text-gray-400'}`}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span className="text-[10px] mt-1 font-medium">Overblik</span>
        </button>
        <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center ${activeTab === 'map' ? 'text-blue-500' : 'text-gray-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
          <span className="text-[10px] mt-1 font-medium">Kort</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center ${activeTab === 'settings' ? 'text-blue-500' : 'text-gray-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4v2m6 6v10" /></svg>
          <span className="text-[10px] mt-1 font-medium">Profil</span>
        </button>
      </nav>
    </div>
  );
};

// --- RENDER ---
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<React.StrictMode><App /></React.StrictMode>);
}
