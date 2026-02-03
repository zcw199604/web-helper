import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { Trash2, X, Loader2, Send, Wifi } from 'lucide-react';
import { cn } from '@/utils/cn';
import { JsonTree } from './ui/JsonTree';
import { ToolHeader, ToolMain, ToolPageShell } from '@/components/ui/ToolLayout';

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
    setList: Dispatch<SetStateAction<KeyValue[]>>,
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
    setList: Dispatch<SetStateAction<KeyValue[]>>,
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
    setList: Dispatch<SetStateAction<KeyValue[]>>,
    type: 'params' | 'headers' | 'form-data' | 'urlencoded'
  ) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="flex bg-gray-50/50 border-b border-gray-200 text-xs font-medium text-gray-500">
        <div className="w-12 px-2 py-2.5 text-center">Use</div>
        <div className="flex-1 px-4 py-2.5 border-l border-gray-100">Key</div>
        {type === 'form-data' ? (
          <div className="w-28 px-4 py-2.5 border-l border-gray-100">Type</div>
        ) : null}
        <div className="flex-1 px-4 py-2.5 border-l border-gray-100">Value</div>
        <div className="w-12 px-2 py-2.5 border-l border-gray-100"></div>
      </div>

      {list.map((item) => (
        <div
          key={item.id}
          className="flex border-b border-gray-100 last:border-0 group hover:bg-gray-50 transition-colors"
        >
          <div className="w-12 flex items-center justify-center">
            <input
              type="checkbox"
              checked={item.isActive}
              onChange={(e) => updateKeyValue(list, setList, item.id, 'isActive', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          <div className="flex-1 border-l border-gray-100">
            <input
              type="text"
              placeholder="Key"
              value={item.key}
              onChange={(e) => updateKeyValue(list, setList, item.id, 'key', e.target.value)}
              className="w-full px-4 py-2.5 text-sm leading-6 outline-none bg-transparent placeholder:text-gray-400"
            />
          </div>

          {type === 'form-data' ? (
            <div className="w-28 border-l border-gray-100">
              <select
                value={item.type}
                onChange={(e) => updateKeyValue(list, setList, item.id, 'type', e.target.value)}
                className="w-full px-2 py-2.5 text-sm leading-6 outline-none bg-transparent text-gray-700 appearance-none cursor-pointer"
              >
                <option value="text">Text</option>
                <option value="file">File</option>
              </select>
            </div>
          ) : null}

          <div className="flex-1 border-l border-gray-100 relative">
            {item.type === 'file' ? (
              <div className="flex items-center px-4 py-2">
                <input
                  type="file"
                  onChange={(e) => updateKeyValue(list, setList, item.id, 'file', e.target.files?.[0] || null)}
                  className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-2.5 file:rounded-md file:border file:border-gray-200 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            ) : (
              <input
                type="text"
                placeholder="Value"
                value={item.value}
                onChange={(e) => updateKeyValue(list, setList, item.id, 'value', e.target.value)}
                className="w-full px-4 py-2.5 text-sm leading-6 outline-none bg-transparent placeholder:text-gray-400"
              />
            )}
          </div>

          <div className="w-12 border-l border-gray-100 flex items-center justify-center">
            <button
              onClick={() => removeKeyValue(list, setList, item.id)}
              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <ToolPageShell>
      <ToolHeader
        title="API 调试"
        description="发送 HTTP 请求并查看响应，也可从 DevTools Network 导入请求"
        icon={<Send className="w-5 h-5" />}
        iconClassName="bg-blue-50 text-blue-600"
        className="border-gray-200"
        toolbar={
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0 flex items-center border border-gray-300 rounded-md bg-white shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as Method)}
                className="h-9 px-3 bg-transparent border-none outline-none text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 rounded-l-md"
              >
                {methods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/v1/..."
                className="h-9 flex-1 min-w-0 px-3 bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400"
                onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSendRequest}
                disabled={loading}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed transition-colors transition-transform duration-75 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/30 inline-flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                发送
              </button>

              <button
                onClick={() => setShowNetworkDrawer(true)}
                className="h-9 px-3 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-md text-sm font-medium inline-flex items-center gap-2 transition-colors transition-transform duration-75 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/20 relative"
                title="从 Network Log 导入"
              >
                <Wifi className="w-4 h-4" />
                <span className="hidden sm:inline">Network</span>
                {capturedRequests.length > 0 ? (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                ) : null}
              </button>
            </div>
          </div>
        }
      />

      <ToolMain className="flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white relative min-h-0">
          {/* Network Drawer */}
          {showNetworkDrawer ? (
            <div className="absolute inset-0 z-50 flex justify-end">
              <div className="absolute inset-0 bg-black/10" onClick={() => setShowNetworkDrawer(false)} />

              <div className="relative w-full max-w-md bg-white border-l border-gray-200 shadow-xl h-full flex flex-col animate-in slide-in-from-right duration-200">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2 min-w-0">
                    <Wifi className="w-5 h-5 text-gray-400" />
                    <h3 className="font-semibold text-gray-900 truncate">Network Log</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCapturedRequests([])}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Clear Log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsCapturing(!isCapturing)}
                      className={cn(
                        'p-2 rounded-md transition-colors',
                        isCapturing
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-gray-400 hover:bg-gray-100'
                      )}
                      title={isCapturing ? 'Capturing...' : 'Paused'}
                    >
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          isCapturing ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
                        )}
                      />
                    </button>
                    <button
                      onClick={() => setShowNetworkDrawer(false)}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50/50">
                  {capturedRequests.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                      <Wifi className="w-12 h-12 mb-3 opacity-20" />
                      <p className="text-sm">暂无捕获到的请求</p>
                      <p className="text-xs mt-1 opacity-70">打开 DevTools 的 Network 面板以捕获请求</p>
                    </div>
                  ) : (
                    capturedRequests.map((req) => (
                      <div
                        key={req.id}
                        onClick={() => populateFromHar(req.harEntry)}
                        className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={cn(
                              'text-xs font-bold px-1.5 py-0.5 rounded',
                              req.method === 'GET'
                                ? 'bg-blue-50 text-blue-700'
                                : req.method === 'POST'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : req.method === 'DELETE'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-gray-100 text-gray-700'
                            )}
                          >
                            {req.method}
                          </span>
                          <span
                            className={cn(
                              'text-xs font-medium',
                              req.status >= 200 && req.status < 300 ? 'text-emerald-700' : 'text-rose-700'
                            )}
                          >
                            {req.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 font-mono truncate" title={req.url}>
                          {req.url}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
                          <span>{req.timestamp}</span>
                          <span className="opacity-0 group-hover:opacity-100 text-blue-600 font-medium">点击加载</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col flex-1 min-h-0 border-b md:border-b-0 md:border-r border-gray-200 bg-white">
            <div className="flex border-b border-gray-200 px-3 gap-1 bg-white">
              {(['params', 'headers', 'body'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-4 py-2.5 text-sm font-medium border-b-2 transition-all rounded-t-md mb-[-1px]',
                    activeTab === tab
                      ? 'border-blue-600 text-blue-700 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  {tab === 'params' ? 'Params' : tab === 'headers' ? 'Headers' : 'Body'}
                  {tab === 'params' && params.filter((p) => p.isActive && p.key).length > 0 ? (
                    <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block align-middle" />
                  ) : null}
                  {tab === 'headers' && headers.filter((h) => h.isActive && h.key).length > 0 ? (
                    <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block align-middle" />
                  ) : null}
                  {tab === 'body' && bodyType !== 'none' ? (
                    <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block align-middle" />
                  ) : null}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'params' ? (
                <div className="space-y-4">
                  <div className="text-sm font-medium text-gray-700">Query Params</div>
                  {renderKeyValueEditor(params, setParams, 'params')}
                </div>
              ) : null}

              {activeTab === 'headers' ? (
                <div className="space-y-4">
                  <div className="text-sm font-medium text-gray-700">Request Headers</div>
                  {renderKeyValueEditor(headers, setHeaders, 'headers')}
                </div>
              ) : null}

              {activeTab === 'body' ? (
                <div className="space-y-4 h-full flex flex-col min-h-0">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-700">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="bodyType"
                        checked={bodyType === 'none'}
                        onChange={() => setBodyType('none')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>None</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="bodyType"
                        checked={bodyType === 'json'}
                        onChange={() => setBodyType('json')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>JSON</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="bodyType"
                        checked={bodyType === 'form-data'}
                        onChange={() => setBodyType('form-data')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Form Data</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="bodyType"
                        checked={bodyType === 'x-www-form-urlencoded'}
                        onChange={() => setBodyType('x-www-form-urlencoded')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>x-www-form-urlencoded</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="bodyType"
                        checked={bodyType === 'raw'}
                        onChange={() => setBodyType('raw')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Raw</span>
                    </label>
                  </div>

                  <div className="flex-1 min-h-0">
                    {bodyType === 'none' ? (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">该请求没有 Body</div>
                    ) : null}

                    {bodyType === 'json' ? (
                      <div className="relative h-full">
                        <textarea
                          value={jsonBody}
                          onChange={(e) => setJsonBody(e.target.value)}
                          placeholder="{ ... }"
                          className="w-full h-full p-3 font-mono text-[13px] leading-relaxed border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-white"
                        />
                        <button
                          onClick={() => {
                            try {
                              const parsed = JSON.parse(jsonBody);
                              setJsonBody(JSON.stringify(parsed, null, 2));
                            } catch {
                              console.error('Invalid JSON');
                            }
                          }}
                          className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 rounded border border-gray-200 transition-colors"
                        >
                          格式化
                        </button>
                      </div>
                    ) : null}

                    {bodyType === 'form-data' ? renderKeyValueEditor(formData, setFormData, 'form-data') : null}
                    {bodyType === 'x-www-form-urlencoded'
                      ? renderKeyValueEditor(urlEncoded, setUrlEncoded, 'urlencoded')
                      : null}
                    {bodyType === 'raw' ? (
                      <textarea
                        value={rawBody}
                        onChange={(e) => setRawBody(e.target.value)}
                        className="w-full h-full p-3 font-mono text-[13px] leading-relaxed border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-white"
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col flex-1 min-h-0 bg-gray-50">
            {error ? (
              <div className="px-4 py-3 bg-rose-50 text-rose-700 text-sm border-b border-rose-100 flex items-center gap-2">
                <X className="w-4 h-4" />
                {error}
              </div>
            ) : null}

            {!response && !loading && !error ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <Send className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">输入 URL 后发送请求</p>
              </div>
            ) : null}

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p className="text-sm">正在发送请求...</p>
              </div>
            ) : null}

            {response ? (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-200 bg-white flex-wrap">
                  <span
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-xs font-bold border',
                      response.status >= 200 && response.status < 300
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-100'
                    )}
                  >
                    {response.status} {response.statusText}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    Time {response.time}ms
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    Size {(response.size / 1024).toFixed(2)} KB
                  </span>
                  <span className="text-xs text-gray-400 truncate max-w-[18rem]" title={response.type}>
                    {response.type}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {response.type.includes('application/json') ? (
                    <JsonTree data={response.body} />
                  ) : response.type.includes('image') ? (
                    <div className="flex items-center justify-center bg-white p-4 rounded-lg border border-gray-200">
                      <img src={response.body} alt="Response" className="max-w-full max-h-[400px] object-contain" />
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-gray-700">{response.body}</pre>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </ToolMain>
    </ToolPageShell>
  );

}
