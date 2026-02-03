import { useState, useCallback } from 'react';
import { Copy, Check, Trash2, AlertTriangle, CheckCircle, KeyRound, Shield, FileText, Lock } from 'lucide-react';
import { decodeJwt, validateJwt, JwtDecodeResult } from '@/utils/jwt';
import { cn } from '@/utils/cn';
import { ToolHeader, ToolMain, ToolPageShell } from '@/components/ui/ToolLayout';

function JwtDecoder() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<JwtDecodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // 解码 JWT
  const handleDecode = useCallback(() => {
    if (!input.trim()) {
      setError('请输入 JWT Token');
      return;
    }
    const validation = validateJwt(input);
    if (!validation.valid) {
      setError(validation.error || '无效的 JWT');
      setResult(null);
      return;
    }
    try {
      setResult(decodeJwt(input));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    }
  }, [input]);

  // 复制
  const handleCopy = useCallback(async (content: string, section: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  }, []);

  // 清空
  const handleClear = useCallback(() => {
    setInput('');
    setResult(null);
    setError(null);
  }, []);

  // 渲染 JSON
  const renderJson = (obj: Record<string, unknown>, section: string, title: string, icon: React.ReactNode, colorClass: string) => {
    const json = JSON.stringify(obj, null, 2);
    return (
      <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
         <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-sm font-semibold text-slate-700">{title}</span>
            </div>
             <button
              onClick={() => handleCopy(json, section)}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              {copiedSection === section ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-600 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
         </div>
        <div className="relative flex-1 bg-slate-50/50 overflow-hidden group">
             <div className={cn("absolute inset-0 w-1", colorClass)}/>
             <pre className="h-full p-4 overflow-auto text-sm font-mono text-slate-700 custom-scrollbar leading-relaxed">
                {json}
            </pre>
        </div>
      </div>
    );
  };

  return (
    <ToolPageShell>
      <ToolHeader
        title="JWT 解码"
        description="JWT Token 解析与验证"
        icon={<KeyRound className="w-5 h-5" />}
        iconClassName="bg-rose-50 text-rose-600"
        actions={
          <>
            <button
              onClick={handleDecode}
              className="btn btn-primary bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 gap-2"
            >
              <Shield className="w-4 h-4" />
              <span>解码 Token</span>
            </button>
            <button onClick={handleClear} className="btn btn-ghost p-2 text-gray-400 hover:text-red-500">
              <Trash2 className="w-5 h-5" />
            </button>
          </>
        }
      />

      <ToolMain className="overflow-y-auto p-6">
         <div className="max-w-5xl mx-auto space-y-6">
            
            {/* 输入区域 */}
             <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-700 ml-1">Token 输入</label>
                <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="粘贴 JWT Token (eyJhbGciOi...)"
                className="w-full h-32 p-4 border border-slate-200 rounded-xl resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm text-slate-700 placeholder:text-slate-300"
                />
             </div>

            {/* 错误提示 */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                     <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* 解码结果 */}
            {result && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* 状态概览 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {/* 状态卡片 */}
                     <div
                        className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border shadow-sm',
                        result.isExpired
                            ? 'bg-red-50 border-red-100'
                            : 'bg-emerald-50 border-emerald-100'
                        )}
                    >
                        <div className={cn("p-3 rounded-full", result.isExpired ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600")}>
                             {result.isExpired ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                        </div>
                        <div>
                             <h4 className={cn("font-bold text-base", result.isExpired ? "text-red-800" : "text-emerald-800")}>
                                {result.isExpired ? 'Token 已过期' : 'Token 有效'}
                             </h4>
                             <p className={cn("text-xs mt-1", result.isExpired ? "text-red-600" : "text-emerald-600")}>
                                {result.expiresAt 
                                    ? `过期时间: ${result.expiresAt.toLocaleString('zh-CN')}`
                                    : '永不过期'
                                }
                             </p>
                        </div>
                    </div>

                    {/* 时间信息卡片 */}
                    {(result.issuedAt || result.expiresAt) && (
                         <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-center space-y-2">
                             {result.issuedAt && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">签发时间 (iat)</span>
                                    <span className="font-mono text-slate-700 font-medium">{result.issuedAt.toLocaleString('zh-CN')}</span>
                                </div>
                            )}
                             {result.expiresAt && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">过期时间 (exp)</span>
                                    <span className="font-mono text-slate-700 font-medium">{result.expiresAt.toLocaleString('zh-CN')}</span>
                                </div>
                            )}
                         </div>
                    )}
                </div>

                {/* 内容详情：Header & Payload */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-96">
                    {renderJson(
                        result.header, 
                        'header', 
                        'Header', 
                        <FileText className="w-4 h-4 text-purple-500" />,
                        "bg-purple-500"
                    )}
                    {renderJson(
                        result.payload, 
                        'payload', 
                        'Payload', 
                        <FileText className="w-4 h-4 text-blue-500" />,
                        "bg-blue-500"
                    )}
                </div>

                {/* Signature */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                     <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-semibold text-slate-700">Signature</span>
                     </div>
                     <div className="p-4">
                        <code className="text-xs font-mono text-slate-500 break-all leading-relaxed">
                            {result.signature}
                        </code>
                     </div>
                     <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-700 flex items-center gap-2">
                         <AlertTriangle className="w-3 h-3" />
                         注意: 此工具仅解码内容，不验证签名的真实性
                     </div>
                </div>

                </div>
            )}
         </div>
      </ToolMain>
    </ToolPageShell>
  );
}

export default JwtDecoder;
