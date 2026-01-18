import React, { useState, useRef, useEffect } from 'react';
import { Play, Plus, Trash2, Save, Upload, X, Loader2, Send, History, Wifi } from 'lucide-react';
import { cn } from '@/utils/cn';
import { JsonTree } from './ui/JsonTree';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

interface KeyValue {
  id: string;
  key: string;
  value: string;
  isActive: boolean;
  type?: 'text' | 'file';
  file?: File | null;
}

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  time: number;
  size: number;
  type: string;
}

interface CapturedRequest {
    id: string;
    url: string;
    method: string;
    status: number;
    timestamp: string;
    harEntry: any;
}

export default function ApiTester() {
  const [method, setMethod] = useState<Method>('GET');
  const [url, setUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body'>('params');
  const [bodyType, setBodyType] = useState<'none' | 'form-data' | 'x-www-form-urlencoded' | 'json' | 'raw'>('none');
  
  const [params, setParams] = useState<KeyValue[]>([{ id: '1', key: '', value: '', isActive: true }]);
  const [headers, setHeaders] = useState<KeyValue[]>([{ id: '1', key: '', value: '', isActive: true }]);
  const [formData, setFormData] = useState<KeyValue[]>([{ id: '1', key: '', value: '', isActive: true, type: 'text' }]);
  const [urlEncoded, setUrlEncoded] = useState<KeyValue[]>([{ id: '1', key: '', value: '', isActive: true }]);
  const [jsonBody, setJsonBody] = useState('');
  const [rawBody, setRawBody] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Network Capture State
  const [showNetworkDrawer, setShowNetworkDrawer] = useState(false);
  const [capturedRequests, setCapturedRequests] = useState<CapturedRequest[]>([]);
  const [isCapturing, setIsCapturing] = useState(true);

  const methods: Method[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  // Handle populating data from HAR entry (DevTools)
  const populateFromHar = (entry: any) => {
      const { request } = entry;
      
      setMethod(request.method as Method);
      setUrl(request.url);

      // Headers
      if (request.headers && request.headers.length > 0) {
        const newHeaders = request.headers.map((h: any, i: number) => ({
            id: Date.now().toString() + i,
            key: h.name,
            value: h.value,
            isActive: true
        }));
        newHeaders.push({ id: Date.now().toString() + 'last', key: '', value: '', isActive: true });
        setHeaders(newHeaders);
      }

       // Body
       if (request.postData) {
        const contentType = request.headers.find((h: any) => h.name.toLowerCase() === 'content-type')?.value?.toLowerCase() || '';
        
        if (contentType.includes('application/json')) {
            setBodyType('json');
            try {
                const parsed = JSON.parse(request.postData.text || '');
                setJsonBody(JSON.stringify(parsed, null, 2));
            } catch {
                setJsonBody(request.postData.text || '');
            }
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            setBodyType('x-www-form-urlencoded');
            if (request.postData.params && request.postData.params.length > 0) {
                 const newUrlEncoded = request.postData.params.map((p: any, i: number) => ({
                    id: Date.now().toString() + i,
                    key: p.name,
                    value: p.value,
                    isActive: true
                }));
                newUrlEncoded.push({ id: Date.now().toString() + 'last', key: '', value: '', isActive: true });
                setUrlEncoded(newUrlEncoded);
            } else if (request.postData.text) {
                 const usp = new URLSearchParams(request.postData.text);
                 const newUrlEncoded: KeyValue[] = [];
                 usp.forEach((value, key) => {
                     newUrlEncoded.push({
                         id: Date.now().toString() + Math.random(),
                         key,
                         value,
                         isActive: true
                     });
                 });
                 newUrlEncoded.push({ id: Date.now().toString() + 'last', key: '', value: '', isActive: true });
                 setUrlEncoded(newUrlEncoded);
            }
        } else if (contentType.includes('multipart/form-data')) {
            setBodyType('form-data');
            // Basic support for form data from HAR
             if (request.postData.params && request.postData.params.length > 0) {
                 const newFormData = request.postData.params.map((p: any, i: number) => ({
                    id: Date.now().toString() + i,
                    key: p.name,
                    value: p.value || '',
                    isActive: true,
                    type: 'text' 
                }));
                newFormData.push({ id: Date.now().toString() + 'last', key: '', value: '', isActive: true, type: 'text' });
                setFormData(newFormData);
            }
        } else {
            setBodyType('raw');
            setRawBody(request.postData.text || '');
        }
    } else {
        setBodyType('none');
    }

    if (request.method === 'GET') {
        setActiveTab('params');
    } else if (request.postData) {
        setActiveTab('body');
    }
    
    setShowNetworkDrawer(false);
  };

  // Listen for requests from DevTools
  useEffect(() => {
    // 1. Message listener (keep for backward compat or manual messages)
    const handleMessage = (message: any) => {
      if (message.type === 'FILL_API_TESTER_REQUEST') {
          populateFromHar(message.payload);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(handleMessage);
    }

    // 2. DevTools Network listener
    // This only works if the page is running as a DevTools panel
    if (typeof chrome !== 'undefined' && chrome.devtools && chrome.devtools.network) {
        const handleRequestFinished = (request: any) => {
            if (!isCapturing) return;
            // Filter out blob/data URLs and extension requests if possible
            if (!request.request.url.startsWith('http')) return;

            setCapturedRequests(prev => {
                const newReq = {
                    id: Date.now().toString() + Math.random(),
                    url: request.request.url,
                    method: request.request.method,
                    status: request.response.status,
                    timestamp: new Date().toLocaleTimeString(),
                    harEntry: request
                };
                return [newReq, ...prev].slice(0, 50); // Keep last 50
            });
        };

        chrome.devtools.network.onRequestFinished.addListener(handleRequestFinished);
        return () => {
             chrome.devtools.network.onRequestFinished.removeListener(handleRequestFinished);
             if (chrome.runtime.onMessage) chrome.runtime.onMessage.removeListener(handleMessage);
        };
    }
    
    return () => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.removeListener(handleMessage);
        }
    };
  }, [isCapturing]);

  // Helper to update key-value pairs
  const updateKeyValue = (
    list: KeyValue[],
    setList: React.Dispatch<React.SetStateAction<KeyValue[]>>,
    id: string,
    field: keyof KeyValue,
    value: any
  ) => {
    const newList = list.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });

    // Auto-add new empty row if editing the last one
    if (list[list.length - 1].id === id && (value !== '' || field === 'file')) {
        newList.push({ id: Date.now().toString(), key: '', value: '', isActive: true, type: 'text' });
    }
    
    setList(newList);
  };

  const removeKeyValue = (
    list: KeyValue[],
    setList: React.Dispatch<React.SetStateAction<KeyValue[]>>,
    id: string
  ) => {
    if (list.length === 1) {
        setList([{ id: Date.now().toString(), key: '', value: '', isActive: true, type: 'text' }]);
        return;
    }
    setList(list.filter(item => item.id !== id));
  };

  const handleSendRequest = async () => {
    setLoading(true);
    setResponse(null);
    setError(null);
    const startTime = performance.now();

    try {
      // 1. Build URL with params
      const activeParams = params.filter(p => p.isActive && p.key);
      const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
      activeParams.forEach(p => urlObj.searchParams.append(p.key, p.value));

      // 2. Build Headers
      const activeHeaders = headers.filter(h => h.isActive && h.key);
      const headerObj: Record<string, string> = {};
      activeHeaders.forEach(h => headerObj[h.key] = h.value);

      // 3. Build Body
      let body: any = undefined;
      
      if (method !== 'GET' && method !== 'HEAD') {
        if (bodyType === 'json') {
          try {
             // Validate JSON
            if (jsonBody) {
                JSON.parse(jsonBody); 
                body = jsonBody;
                headerObj['Content-Type'] = 'application/json';
            }
          } catch (e) {
            throw new Error('Invalid JSON format');
          }
        } else if (bodyType === 'form-data') {
          const fd = new FormData();
          formData.filter(p => p.isActive && p.key).forEach(p => {
            if (p.type === 'file' && p.file) {
              fd.append(p.key, p.file);
            } else {
              fd.append(p.key, p.value);
            }
          });
          body = fd;
          // Note: Fetch automatically sets Content-Type for FormData
        } else if (bodyType === 'x-www-form-urlencoded') {
          const usp = new URLSearchParams();
          urlEncoded.filter(p => p.isActive && p.key).forEach(p => {
            usp.append(p.key, p.value);
          });
          body = usp;
          headerObj['Content-Type'] = 'application/x-www-form-urlencoded';
        } else if (bodyType === 'raw') {
            body = rawBody;
        }
      }

      const res = await fetch(urlObj.toString(), {
        method,
        headers: headerObj,
        body
      });

      const endTime = performance.now();
      const time = Math.round(endTime - startTime);
      
      const blob = await res.blob();
      const size = blob.size;
      const type = res.headers.get('content-type') || 'text/plain';
      
      let resBody: any;
      if (type.includes('application/json')) {
        const text = await blob.text();
        try {
          resBody = JSON.parse(text);
        } catch {
          resBody = text;
        }
      } else if (type.includes('image')) {
          resBody = URL.createObjectURL(blob);
      } else {
        resBody = await blob.text();
      }

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((val, key) => resHeaders[key] = val);

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        body: resBody,
        time,
        size,
        type
      });

    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const renderKeyValueEditor = (
    list: KeyValue[],
    setList: React.Dispatch<React.SetStateAction<KeyValue[]>>,
    type: 'params' | 'headers' | 'form-data' | 'urlencoded'
  ) => (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
            <div className="w-10 px-2 py-2 text-center">Use</div>
            <div className="flex-1 px-3 py-2 border-l border-slate-200">Key</div>
            {type === 'form-data' && <div className="w-24 px-3 py-2 border-l border-slate-200">Type</div>}
            <div className="flex-1 px-3 py-2 border-l border-slate-200">Value</div>
            <div className="w-10 px-2 py-2 border-l border-slate-200"></div>
        </div>
        {list.map((item) => (
            <div key={item.id} className="flex border-b border-slate-200 last:border-0 group">
                <div className="w-10 flex items-center justify-center">
                    <input 
                        type="checkbox" 
                        checked={item.isActive}
                        onChange={(e) => updateKeyValue(list, setList, item.id, 'isActive', e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                </div>
                <div className="flex-1 border-l border-slate-200">
                    <input 
                        type="text" 
                        placeholder="Key"
                        value={item.key}
                        onChange={(e) => updateKeyValue(list, setList, item.id, 'key', e.target.value)}
                        className="w-full px-3 py-2 text-sm outline-none bg-transparent"
                    />
                </div>
                {type === 'form-data' && (
                    <div className="w-24 border-l border-slate-200">
                         <select 
                            value={item.type}
                            onChange={(e) => updateKeyValue(list, setList, item.id, 'type', e.target.value)}
                            className="w-full px-2 py-2 text-sm outline-none bg-transparent appearance-none"
                         >
                             <option value="text">Text</option>
                             <option value="file">File</option>
                         </select>
                    </div>
                )}
                <div className="flex-1 border-l border-slate-200 relative">
                    {item.type === 'file' ? (
                        <div className="flex items-center px-2 py-1">
                             <input 
                                type="file"
                                onChange={(e) => updateKeyValue(list, setList, item.id, 'file', e.target.files?.[0] || null)}
                                className="text-sm text-slate-500 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>
                    ) : (
                        <input 
                            type="text" 
                            placeholder="Value"
                            value={item.value}
                            onChange={(e) => updateKeyValue(list, setList, item.id, 'value', e.target.value)}
                            className="w-full px-3 py-2 text-sm outline-none bg-transparent"
                        />
                    )}
                </div>
                 <div className="w-10 border-l border-slate-200 flex items-center justify-center">
                    <button 
                        onClick={() => removeKeyValue(list, setList, item.id)}
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
            </div>
        ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Top Bar: Method & URL */}
      <div className="p-4 bg-white border-b border-slate-200 flex gap-3 shadow-sm z-10">
        <div className="flex-1 flex gap-0 rounded-lg shadow-sm">
            <select 
                value={method}
                onChange={(e) => setMethod(e.target.value as Method)}
                className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-l-lg border-r-0 font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            >
                {methods.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter request URL"
                className="flex-1 px-4 py-2 border border-slate-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
            />
        </div>
        <button 
            onClick={handleSendRequest}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
        </button>
        
        {/* Network Toggle Button */}
         <button 
            onClick={() => setShowNetworkDrawer(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-all relative"
            title="Import from Network Log"
        >
            <Wifi className="w-4 h-4" />
            <span className="hidden sm:inline">Network</span>
            {capturedRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
            )}
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
        {/* Network Drawer */}
        {showNetworkDrawer && (
            <div className="absolute inset-0 z-50 flex justify-end">
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" 
                    onClick={() => setShowNetworkDrawer(false)}
                />
                
                {/* Drawer Panel */}
                <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                        <div className="flex items-center gap-2">
                             <Wifi className="w-5 h-5 text-slate-500" />
                             <h3 className="font-semibold text-slate-800">Network Log</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setCapturedRequests([])} 
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Clear Log"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                             <button 
                                onClick={() => setIsCapturing(!isCapturing)} 
                                className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    isCapturing ? "text-green-600 bg-green-50 hover:bg-green-100" : "text-slate-400 hover:bg-slate-100"
                                )}
                                title={isCapturing ? "Capturing..." : "Paused"}
                            >
                                <div className={cn("w-2 h-2 rounded-full", isCapturing ? "bg-green-500 animate-pulse" : "bg-slate-300")} />
                            </button>
                            <button 
                                onClick={() => setShowNetworkDrawer(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50">
                        {capturedRequests.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                                <Wifi className="w-12 h-12 mb-3 opacity-20" />
                                <p className="text-sm">No requests captured yet.</p>
                                <p className="text-xs mt-1 opacity-70">Open DevTools Network tab to capture.</p>
                            </div>
                        ) : (
                            capturedRequests.map((req) => (
                                <div 
                                    key={req.id}
                                    onClick={() => populateFromHar(req.harEntry)}
                                    className="p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all group"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={cn(
                                            "text-xs font-bold px-1.5 py-0.5 rounded",
                                            req.method === 'GET' ? "bg-blue-50 text-blue-700" :
                                            req.method === 'POST' ? "bg-green-50 text-green-700" :
                                            req.method === 'DELETE' ? "bg-red-50 text-red-700" :
                                            "bg-slate-100 text-slate-700"
                                        )}>
                                            {req.method}
                                        </span>
                                        <span className={cn(
                                            "text-xs font-medium",
                                            req.status >= 200 && req.status < 300 ? "text-green-600" : "text-red-600"
                                        )}>
                                            {req.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-600 font-mono truncate" title={req.url}>
                                        {req.url}
                                    </div>
                                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                                        <span>{req.timestamp}</span>
                                        <span className="opacity-0 group-hover:opacity-100 text-blue-500 font-medium">Click to Load</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Left/Top: Request Configuration */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-slate-200 bg-white">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-2">
                {['params', 'headers', 'body'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={cn(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === tab 
                                ? "border-blue-600 text-blue-600" 
                                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        )}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {tab === 'params' && params.filter(p => p.isActive && p.key).length > 0 && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block align-middle"/>}
                        {tab === 'headers' && headers.filter(h => h.isActive && h.key).length > 0 && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block align-middle"/>}
                        {tab === 'body' && bodyType !== 'none' && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block align-middle"/>}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'params' && (
                    <div className="space-y-4">
                         <div className="text-sm font-medium text-slate-700">Query Params</div>
                         {renderKeyValueEditor(params, setParams, 'params')}
                    </div>
                )}
                
                {activeTab === 'headers' && (
                     <div className="space-y-4">
                        <div className="text-sm font-medium text-slate-700">Request Headers</div>
                        {renderKeyValueEditor(headers, setHeaders, 'headers')}
                   </div>
                )}

                {activeTab === 'body' && (
                    <div className="space-y-4 h-full flex flex-col">
                         <div className="flex items-center gap-4 text-sm">
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="radio" name="bodyType" checked={bodyType === 'none'} onChange={() => setBodyType('none')} />
                                 <span>None</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="radio" name="bodyType" checked={bodyType === 'json'} onChange={() => setBodyType('json')} />
                                 <span>JSON</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="radio" name="bodyType" checked={bodyType === 'form-data'} onChange={() => setBodyType('form-data')} />
                                 <span>Form Data</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="radio" name="bodyType" checked={bodyType === 'x-www-form-urlencoded'} onChange={() => setBodyType('x-www-form-urlencoded')} />
                                 <span>x-www-form-urlencoded</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="radio" name="bodyType" checked={bodyType === 'raw'} onChange={() => setBodyType('raw')} />
                                 <span>Raw</span>
                             </label>
                         </div>
                         
                         <div className="flex-1 min-h-0">
                             {bodyType === 'none' && (
                                 <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                                     This request has no body
                                 </div>
                             )}
                             {bodyType === 'json' && (
                                 <div className="relative h-full">
                                     <textarea 
                                        value={jsonBody}
                                        onChange={(e) => setJsonBody(e.target.value)}
                                        placeholder="{ ... }"
                                        className="w-full h-full p-3 font-mono text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                     />
                                     <button
                                        onClick={() => {
                                            try {
                                                const parsed = JSON.parse(jsonBody);
                                                setJsonBody(JSON.stringify(parsed, null, 2));
                                            } catch (e) {
                                                // Could add a toast here, but for now just visual feedback via button might be enough or console
                                                console.error("Invalid JSON");
                                            }
                                        }}
                                        className="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded border border-slate-200 transition-colors"
                                     >
                                         Format
                                     </button>
                                 </div>
                             )}
                             {bodyType === 'form-data' && renderKeyValueEditor(formData, setFormData, 'form-data')}
                             {bodyType === 'x-www-form-urlencoded' && renderKeyValueEditor(urlEncoded, setUrlEncoded, 'urlencoded')}
                             {bodyType === 'raw' && (
                                 <textarea 
                                    value={rawBody}
                                    onChange={(e) => setRawBody(e.target.value)}
                                    className="w-full h-full p-3 font-mono text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                 />
                             )}
                         </div>
                    </div>
                )}
            </div>
        </div>

        {/* Right/Bottom: Response */}
        <div className="h-1/2 md:h-full md:w-1/2 flex flex-col bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200">
            {error && (
                <div className="p-4 bg-red-50 text-red-600 text-sm border-b border-red-100 flex items-center gap-2">
                    <X className="w-4 h-4" />
                    {error}
                </div>
            )}
            
            {!response && !loading && !error && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <Send className="w-12 h-12 mb-4 opacity-20" />
                    <p>Enter URL and send request</p>
                </div>
            )}

            {loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                    <p>Sending request...</p>
                </div>
            )}

            {response && (
                <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-200 bg-white text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Status:</span>
                            <span className={cn("font-bold", response.status >= 200 && response.status < 300 ? "text-green-600" : "text-red-600")}>
                                {response.status} {response.statusText}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Time:</span>
                            <span className="font-semibold text-slate-700">{response.time}ms</span>
                        </div>
                         <div className="flex items-center gap-2">
                            <span className="text-slate-500">Size:</span>
                            <span className="font-semibold text-slate-700">{(response.size / 1024).toFixed(2)} KB</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                         {response.type.includes('application/json') ? (
                             <JsonTree data={response.body} />
                         ) : response.type.includes('image') ? (
                             <div className="flex items-center justify-center bg-checkered p-4 rounded-lg border border-slate-200">
                                 <img src={response.body} alt="Response" className="max-w-full max-h-[400px] object-contain" />
                             </div>
                         ) : (
                             <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700">{response.body}</pre>
                         )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
