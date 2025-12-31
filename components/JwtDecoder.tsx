import { useState, useCallback } from 'react';
import { Copy, Check, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { decodeJwt, validateJwt, formatTimestamp, JwtDecodeResult } from '@/utils/jwt';
import { cn } from '@/utils/cn';

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
  const renderJson = (obj: Record<string, unknown>, section: string) => {
    const json = JSON.stringify(obj, null, 2);
    return (
      <div className="relative">
        <button
          onClick={() => handleCopy(json, section)}
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-200"
        >
          {copiedSection === section ? (
            <>
              <Check className="w-3 h-3 text-green-500" />
              <span className="text-green-500">已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>复制</span>
            </>
          )}
        </button>
        <pre className="p-4 bg-gray-800 text-gray-100 rounded-lg overflow-auto text-sm font-mono">
          {json}
        </pre>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-auto">
      {/* 标题栏 */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">JWT 解码</h2>
        <p className="text-sm text-gray-500">解析 JWT Token，查看 Header 和 Payload</p>
      </div>

      {/* 输入区域 */}
      <div className="mb-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="粘贴 JWT Token..."
          className="w-full h-24 p-4 border border-gray-300 rounded-lg resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleDecode}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            解码
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            清空
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 解码结果 */}
      {result && (
        <div className="space-y-4">
          {/* 过期状态 */}
          <div
            className={cn(
              'flex items-center gap-2 p-3 rounded-lg',
              result.isExpired
                ? 'bg-red-50 border border-red-200'
                : 'bg-green-50 border border-green-200'
            )}
          >
            {result.isExpired ? (
              <>
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-red-700 font-medium">Token 已过期</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-700 font-medium">Token 有效</span>
              </>
            )}
            {result.expiresAt && (
              <span className="text-sm text-gray-600 ml-2">
                过期时间: {result.expiresAt.toLocaleString('zh-CN')}
              </span>
            )}
          </div>

          {/* Header */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">Header</span>
              头部信息
            </h3>
            {renderJson(result.header, 'header')}
          </div>

          {/* Payload */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Payload</span>
              载荷数据
            </h3>
            {renderJson(result.payload, 'payload')}
          </div>

          {/* 时间信息 */}
          {(result.issuedAt || result.expiresAt) && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">时间信息</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {result.issuedAt && (
                  <div>
                    <span className="text-gray-500">签发时间 (iat): </span>
                    <span className="font-mono text-gray-700">
                      {result.issuedAt.toLocaleString('zh-CN')}
                    </span>
                  </div>
                )}
                {result.expiresAt && (
                  <div>
                    <span className="text-gray-500">过期时间 (exp): </span>
                    <span className={cn(
                      'font-mono',
                      result.isExpired ? 'text-red-600' : 'text-gray-700'
                    )}>
                      {result.expiresAt.toLocaleString('zh-CN')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Signature */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">Signature</span>
              签名
            </h3>
            <div className="p-4 bg-gray-100 rounded-lg">
              <code className="text-sm font-mono text-gray-600 break-all">
                {result.signature}
              </code>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              注意: 此工具仅解码 JWT，不验证签名有效性
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default JwtDecoder;
