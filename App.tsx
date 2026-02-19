
import React, { useState, useEffect, useRef } from 'react';
import { Package, PackageStatus, Carrier, ParseResult } from './types.ts';
import { PackageCard } from './components/PackageCard.tsx';
import { parsePackageText, parsePackageImage } from './services/geminiService.ts';
import { fetchOutlookEmails, loginToOutlook } from './services/outlookService.ts';

type TabType = 'current' | 'history' | 'settings' | 'map';

const App: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [showInput, setShowInput] = useState(false);
  const [outlookToken, setOutlookToken] = useState<string | null>(localStorage.getItem('outlook-token'));
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('last-sync-time'));
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('pakke-tracker-data');
    if (saved) {
      try {
        setPackages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved packages", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pakke-tracker-data', JSON.stringify(packages));
  }, [packages]);

  const processParsedResult = (result: ParseResult, sourceText: string) => {
    if (result && result.trackingNumber) {
      const existingIndex = packages.findIndex(p => p.trackingNumber === result.trackingNumber);
      
      if (existingIndex > -1) {
        const updatedPackages = [...packages];
        updatedPackages[existingIndex] = {
          ...updatedPackages[existingIndex],
          status: result.status,
          sender: result.sender || updatedPackages[existingIndex].sender,
          lastUpdated: new Date().toISOString(),
        };
        setPackages(updatedPackages);
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
      let token = outlookToken;
      if (!token) {
        token = await loginToOutlook();
        setOutlookToken(token);
        localStorage.setItem('outlook-token', token);
      }

      const syncTime = new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
      setLastSync(syncTime);
      localStorage.setItem('last-sync-time', syncTime);
    } catch (e) {
      console.error(e);
      alert("Outlook synkronisering fejlede.");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAllData = () => {
    if (confirm("Er du sikker? Dette vil slette din historik og logge dig ud. Dette påvirker kun denne enhed.")) {
      setPackages([]);
      setOutlookToken(null);
      setLastSync(null);
      localStorage.removeItem('pakke-tracker-data');
      localStorage.removeItem('outlook-token');
      localStorage.removeItem('last-sync-time');
      setActiveTab('current');
    }
  };

  const logoutOutlook = () => {
    setOutlookToken(null);
    localStorage.removeItem('outlook-token');
    alert("Logget ud af Outlook.");
  };

  const filteredPackages = packages.filter(p => 
    activeTab === 'current' 
      ? p.status !== PackageStatus.PICKED_UP 
      : p.status === PackageStatus.PICKED_UP
  );

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
                <span className="text-[10px] text-gray-400 font-medium tracking-tight">
                  • Synkroniseret {lastSync}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {activeTab === 'settings' ? 'Profil' : activeTab === 'map' ? 'Find Pakker' : 'Pakker'}
            </h1>
          </div>
          {activeTab !== 'settings' && activeTab !== 'map' && (
            <div className="flex gap-2">
               <button 
                  onClick={handleSyncOutlook}
                  disabled={isProcessing}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md ${
                    isProcessing ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 text-blue-500 active:scale-95'
                  }`}
                >
                  <svg className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button 
                  onClick={() => setShowInput(!showInput)}
                  className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
                >
                  <svg className={`w-6 h-6 transition-transform ${showInput ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {activeTab === 'settings' ? (
          <div className="p-6 animate-in fade-in duration-300">
            <div className="mb-8">
              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-4">Automation</h3>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Outlook Konto</p>
                      <p className="text-xs text-gray-400">{outlookToken ? 'Forbundet' : 'Ikke tilknyttet'}</p>
                    </div>
                  </div>
                  {outlookToken ? (
                    <button onClick={logoutOutlook} className="text-sm text-red-500 font-medium">Log ud</button>
                  ) : (
                    <button onClick={handleSyncOutlook} className="text-sm text-blue-500 font-medium">Forbind</button>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-4">Privatliv & Sikkerhed</h3>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    </div>
                    <p className="text-sm font-semibold">Lokal lagring</p>
                  </div>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">Privat</span>
                </div>
                <button 
                  onClick={clearAllData}
                  className="w-full text-left p-4 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                >
                  Slet alt data på denne enhed
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'map' ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 p-6 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
               </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Pakke-kort</h3>
            <p className="text-sm leading-relaxed">Vi arbejder på at vise dine DAO og GLS pakkeshops på et kort her.</p>
          </div>
        ) : (
          <div className="px-6 pt-6 animate-in fade-in duration-300">
            {showInput && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 mb-6 animate-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="text-sm font-bold text-gray-700">Ny pakke</h3>
                   <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-blue-500 font-bold text-[11px] bg-blue-50 px-3 py-2 rounded-full active:bg-blue-100"
                   >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                      SCAN SCREENSHOT
                   </button>
                   <input type="file" ref={fileInputRef} onChange={(e) => {
                     const file = e.target.files?.[0];
                     if(file) {
                       setIsProcessing(true);
                       const reader = new FileReader();
                       reader.onload = async (ev) => {
                         const base64Data = (ev.target?.result as string).split(',')[1];
                         const result = await parsePackageImage(base64Data, file.type);
                         if (result && processParsedResult(result, `Screenshot: ${file.name}`)) {
                           setShowInput(false);
                         }
                         setIsProcessing(false);
                       };
                       reader.readAsDataURL(file);
                     }
                   }} className="hidden" accept="image/*" />
                </div>
                
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full h-20 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm mb-3"
                  placeholder="Indsæt tekst fra SMS/Email..."
                />
                <button
                  onClick={async () => {
                    setIsProcessing(true);
                    const res = await parsePackageText(inputText);
                    if(res && processParsedResult(res, inputText)) { setInputText(''); setShowInput(false); }
                    setIsProcessing(false);
                  }}
                  disabled={isProcessing || !inputText.trim()}
                  className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  Gem manuelt
                </button>
              </div>
            )}

            <div className="flex p-1 bg-gray-200/80 rounded-xl mb-6">
              <button onClick={() => setActiveTab('current')} className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'current' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                Aktive ({packages.filter(p => p.status !== PackageStatus.PICKED_UP).length})
              </button>
              <button onClick={() => setActiveTab('history')} className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                Historik
              </button>
            </div>

            {filteredPackages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <svg className="w-16 h-16 mb-4 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                <p className="font-medium">Ingen pakker</p>
              </div>
            ) : (
              filteredPackages.map(pkg => (
                <PackageCard 
                  key={pkg.id} 
                  pkg={pkg} 
                  onToggleStatus={(id) => setPackages(prev => prev.map(p => p.id === id ? {...p, status: p.status === PackageStatus.PICKED_UP ? PackageStatus.READY_FOR_PICKUP : PackageStatus.PICKED_UP} : p))}
                  onDelete={(id) => setPackages(prev => prev.filter(p => p.id !== id))}
                />
              ))
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-20 bg-white/90 ios-blur border-t border-gray-200 px-10 flex items-center justify-between z-50 safe-area-bottom">
        <button onClick={() => setActiveTab('current')} className={`flex flex-col items-center transition-colors ${activeTab === 'current' || activeTab === 'history' ? 'text-blue-500' : 'text-gray-400'}`}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span className="text-[10px] mt-1 font-medium">Overblik</span>
        </button>
        <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center transition-colors ${activeTab === 'map' ? 'text-blue-500' : 'text-gray-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span className="text-[10px] mt-1 font-medium">Kort</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center transition-colors ${activeTab === 'settings' ? 'text-blue-500' : 'text-gray-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          <span className="text-[10px] mt-1 font-medium">Profil</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
