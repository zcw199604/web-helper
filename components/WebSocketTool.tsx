import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Cable,
  Check,
  Copy,
  Pause,
  Play,
  Plug,
  PlugZap,
  RotateCw,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { ToolHeader, ToolMain, ToolPageShell } from '@/components/ui/ToolLayout';
import { base64ToBytes, bytesToBase64, bytesToHex, bytesToUtf8, hexToBytes } from '@/utils/ws-codec';
import {
  buildPageConnectExpression,
  buildPageDisconnectExpression,
  buildPagePollExpression,
  buildPageSendBinaryExpression,
  buildPageSendTextExpression,
  devtoolsEval,
  hasDevtoolsEval,
  type PageEvent,
  type PagePollPayload,
} from '@/utils/ws-page-bridge';

type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type ConnMode = 'extension' | 'page';

type SendMode = 'text' | 'json' | 'binary';

type BinaryInputFormat = 'base64' | 'hex';

type LogDirection = 'in' | 'out' | 'system';

type LogKind = 'text' | 'json' | 'binary';

type LogEntry = {
  id: string;
  ts: number;
  direction: LogDirection;
  kind: LogKind;
  text?: string;
  jsonPretty?: string;
  bytes?: Uint8Array;
};

function formatTime(ts: number) {
  // Keep it short; this is a debugging tool.
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false });
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const LOG_LIMIT = 500;

function tryParseJson(text: string): { pretty: string } | null {
  try {
    const v = JSON.parse(text);
    return { pretty: JSON.stringify(v, null, 2) };
  } catch {
    return null;
  }
}

function formatHexLines(bytes: Uint8Array, bytesPerLine = 16): string {
  if (bytes.length === 0) return '';

  const hex = bytesToHex(bytes);
  const parts: string[] = [];
  for (let i = 0; i < hex.length; i += 2) parts.push(hex.slice(i, i + 2));

  const lines: string[] = [];
  for (let i = 0; i < parts.length; i += bytesPerLine) {
    lines.push(parts.slice(i, i + bytesPerLine).join(' '));
  }

  return lines.join('\n');
}

export default function WebSocketTool() {
  const wsRef = useRef<WebSocket | null>(null);
  const connSeqRef = useRef(0);
  const manualCloseRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const pagePollTimerRef = useRef<number | null>(null);
  const pagePollInFlightRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const [url, setUrl] = useState('wss://echo.websocket.events');
  const [connMode, setConnMode] = useState<ConnMode>('extension');
  const [status, setStatus] = useState<WsStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const [sendMode, setSendMode] = useState<SendMode>('text');
  const [binaryInputFormat, setBinaryInputFormat] = useState<BinaryInputFormat>('base64');
  const [message, setMessage] = useState('');

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);

  // Message display / filtering
  const [searchText, setSearchText] = useState('');
  const [showIn, setShowIn] = useState(true);
  const [showOut, setShowOut] = useState(true);
  const [showSystem, setShowSystem] = useState(true);
  const [onlyJson, setOnlyJson] = useState(false);
  const [pauseScroll, setPauseScroll] = useState(false);
  const [jsonPrettyView, setJsonPrettyView] = useState(true);
  const [binaryView, setBinaryView] = useState<'hex' | 'base64' | 'utf8'>('hex');

  // Stability features
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [reconnectIntervalMs, setReconnectIntervalMs] = useState(2000);
  const [maxReconnectAttempts, setMaxReconnectAttempts] = useState(10);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const [heartbeatEnabled, setHeartbeatEnabled] = useState(false);
  const [heartbeatIntervalMs, setHeartbeatIntervalMs] = useState(30000);
  const [heartbeatPayload, setHeartbeatPayload] = useState('ping');

  const devtoolsSupported = useMemo(() => hasDevtoolsEval(), []);

  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'ts'>) => {
    setLogs((prev) => {
      const next = [...prev, { id: makeId(), ts: Date.now(), ...entry }];
      if (next.length > LOG_LIMIT) next.splice(0, next.length - LOG_LIMIT);
      return next;
    });
  }, []);

  const setReconnectAttemptsBoth = useCallback((n: number) => {
    reconnectAttemptsRef.current = n;
    setReconnectAttempts(n);
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const stopPagePolling = useCallback(() => {
    if (pagePollTimerRef.current) {
      window.clearInterval(pagePollTimerRef.current);
      pagePollTimerRef.current = null;
    }
    pagePollInFlightRef.current = false;
  }, []);

  const closeExtensionSocketSilently = useCallback(() => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (!ws) return;
    try {
      ws.close(1000, 'close');
    } catch {
      // ignore
    }
  }, []);

  const disconnect = useCallback(
    async (opts?: { silent?: boolean }) => {
      setError(null);
      manualCloseRef.current = true;
      clearReconnectTimer();
      stopPagePolling();

      if (heartbeatTimerRef.current) {
        window.clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }

      if (connMode === 'extension') {
        closeExtensionSocketSilently();
      } else {
        try {
          await devtoolsEval(buildPageDisconnectExpression());
        } catch {
          // ignore
        }
      }

      setStatus('disconnected');
      setReconnectAttemptsBoth(0);
      if (!opts?.silent) addLog({ direction: 'system', kind: 'text', text: '已断开连接' });
    },
    [addLog, clearReconnectTimer, closeExtensionSocketSilently, connMode, setReconnectAttemptsBoth, stopPagePolling]
  );

  const connectLatestRef = useRef<() => void>(() => {});

  const scheduleReconnect = useCallback(
    (reason: string) => {
      if (!autoReconnect) return;
      if (manualCloseRef.current) return;
      clearReconnectTimer();

      const current = reconnectAttemptsRef.current;
      const max = Math.max(0, Number.isFinite(maxReconnectAttempts) ? maxReconnectAttempts : 0);
      const nextAttempt = current + 1;
      if (max > 0 && nextAttempt > max) {
        addLog({ direction: 'system', kind: 'text', text: `自动重连已停止：达到最大次数（${max}）` });
        return;
      }

      const delayRaw = Number.isFinite(reconnectIntervalMs) ? reconnectIntervalMs : 2000;
      const delay = Math.max(200, Math.floor(delayRaw));
      setReconnectAttemptsBoth(nextAttempt);
      const counter = max > 0 ? `${nextAttempt}/${max}` : `${nextAttempt}/∞`;
      addLog({
        direction: 'system',
        kind: 'text',
        text: `${reason}，将在 ${(delay / 1000).toFixed(1)}s 后重连（${counter}）`,
      });

      reconnectTimerRef.current = window.setTimeout(() => {
        connectLatestRef.current();
      }, delay);
    },
    [addLog, autoReconnect, clearReconnectTimer, maxReconnectAttempts, reconnectIntervalMs, setReconnectAttemptsBoth]
  );

  const connect = useCallback(
    (resetReconnectAttempts: boolean) => {
      const nextUrl = url.trim();
      setError(null);
      manualCloseRef.current = false;
      clearReconnectTimer();
      stopPagePolling();

      if (heartbeatTimerRef.current) {
        window.clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }

      if (!nextUrl) {
        setStatus('error');
        setError('请输入 WebSocket URL（ws:// 或 wss://）');
        return;
      }

      // Close existing connection (silently).
      closeExtensionSocketSilently();

      if (resetReconnectAttempts) setReconnectAttemptsBoth(0);

      const seq = ++connSeqRef.current;
      setStatus('connecting');
      addLog({
        direction: 'system',
        kind: 'text',
        text: `正在连接：${nextUrl}${connMode === 'page' ? '（页面上下文）' : ''}`,
      });

      if (connMode === 'extension') {
        let ws: WebSocket;
        try {
          ws = new WebSocket(nextUrl);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setStatus('error');
          setError(msg);
          addLog({ direction: 'system', kind: 'text', text: `连接失败：${msg}` });
          return;
        }

        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;

        ws.onopen = () => {
          if (connSeqRef.current !== seq) return;
          setStatus('connected');
          setReconnectAttemptsBoth(0);
          addLog({ direction: 'system', kind: 'text', text: '连接已建立' });
        };

        ws.onclose = (ev) => {
          if (connSeqRef.current !== seq) return;
          wsRef.current = null;
          setStatus('disconnected');
          const reason = ev.reason ? `，原因：${ev.reason}` : '';
          addLog({ direction: 'system', kind: 'text', text: `连接已关闭（code: ${ev.code}${reason}）` });
          scheduleReconnect('连接断开');
        };

        ws.onerror = () => {
          if (connSeqRef.current !== seq) return;
          setStatus('error');
          setError('WebSocket 连接发生错误（浏览器未提供详细信息）');
          addLog({ direction: 'system', kind: 'text', text: '连接错误' });
        };

        ws.onmessage = async (ev) => {
          if (connSeqRef.current !== seq) return;
          const d: unknown = (ev as MessageEvent).data;

          if (typeof d === 'string') {
            const parsed = tryParseJson(d);
            if (parsed) addLog({ direction: 'in', kind: 'json', text: d, jsonPretty: parsed.pretty });
            else addLog({ direction: 'in', kind: 'text', text: d });
            return;
          }

          if (d instanceof ArrayBuffer) {
            addLog({ direction: 'in', kind: 'binary', bytes: new Uint8Array(d) });
            return;
          }

          if (d instanceof Blob) {
            try {
              const buf = await d.arrayBuffer();
              addLog({ direction: 'in', kind: 'binary', bytes: new Uint8Array(buf) });
            } catch {
              addLog({ direction: 'system', kind: 'text', text: '收到 Blob 消息，但读取失败' });
            }
            return;
          }

          addLog({ direction: 'in', kind: 'text', text: String(d) });
        };

        return;
      }

      if (!devtoolsSupported) {
        setStatus('error');
        setError('页面上下文模式仅在 DevTools 面板中可用');
        addLog({ direction: 'system', kind: 'text', text: '无法使用页面上下文：当前不在 DevTools 面板' });
        return;
      }

      void (async () => {
        try {
          await devtoolsEval(buildPageConnectExpression(nextUrl));
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setStatus('error');
          setError(msg);
          addLog({ direction: 'system', kind: 'text', text: `连接失败：${msg}` });
          return;
        }

        stopPagePolling();
        pagePollTimerRef.current = window.setInterval(async () => {
          if (connSeqRef.current !== seq) return;
          if (pagePollInFlightRef.current) return;
          pagePollInFlightRef.current = true;

          try {
            const json = await devtoolsEval<string>(buildPagePollExpression());
            const payload: PagePollPayload = JSON.parse(json || '{}');
            if (!payload?.hasState) {
              setStatus('disconnected');
              addLog({ direction: 'system', kind: 'text', text: '页面上下文已失效（页面可能已刷新）' });
              stopPagePolling();
              scheduleReconnect('页面上下文丢失');
              return;
            }

            const events: PageEvent[] = payload.events || [];

            for (const ev of events) {
              if (ev.type === 'open') {
                setStatus('connected');
                setReconnectAttemptsBoth(0);
                addLog({ direction: 'system', kind: 'text', text: '连接已建立（页面上下文）' });
              } else if (ev.type === 'error') {
                setStatus('error');
                setError('WebSocket 连接发生错误（页面上下文）');
                addLog({ direction: 'system', kind: 'text', text: '连接错误（页面上下文）' });
              } else if (ev.type === 'close') {
                setStatus('disconnected');
                const reason = ev.reason ? `，原因：${ev.reason}` : '';
                addLog({ direction: 'system', kind: 'text', text: `连接已关闭（code: ${ev.code}${reason}）` });
                stopPagePolling();
                scheduleReconnect('连接断开');
              } else if (ev.type === 'message') {
                if (ev.kind === 'text') {
                  const parsed = tryParseJson(ev.data);
                  if (parsed) addLog({ direction: 'in', kind: 'json', text: ev.data, jsonPretty: parsed.pretty });
                  else addLog({ direction: 'in', kind: 'text', text: ev.data });
                } else {
                  try {
                    addLog({ direction: 'in', kind: 'binary', bytes: base64ToBytes(ev.data) });
                  } catch {
                    addLog({ direction: 'in', kind: 'text', text: ev.data });
                  }
                }
              }
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setStatus('error');
            setError(`页面上下文轮询失败：${msg}`);
            addLog({ direction: 'system', kind: 'text', text: `页面上下文轮询失败：${msg}` });
            stopPagePolling();
          } finally {
            pagePollInFlightRef.current = false;
          }
        }, 400);
      })();
    },
    [
      addLog,
      clearReconnectTimer,
      closeExtensionSocketSilently,
      connMode,
      devtoolsSupported,
      scheduleReconnect,
      setReconnectAttemptsBoth,
      stopPagePolling,
      url,
    ]
  );

  useEffect(() => {
    connectLatestRef.current = () => connect(false);
  }, [connect]);

  const filteredLogs = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return logs.filter((l) => {
      if (l.direction === 'in' && !showIn) return false;
      if (l.direction === 'out' && !showOut) return false;
      if (l.direction === 'system' && !showSystem) return false;
      if (onlyJson && l.kind !== 'json') return false;
      if (!q) return true;

      let hay = '';
      if (l.kind === 'binary' && l.bytes) {
        hay =
          binaryView === 'base64'
            ? bytesToBase64(l.bytes)
            : binaryView === 'utf8'
              ? bytesToUtf8(l.bytes)
              : bytesToHex(l.bytes);
      } else if (l.kind === 'json') {
        hay = `${l.text || ''}\n${l.jsonPretty || ''}`;
      } else {
        hay = l.text || '';
      }

      return hay.toLowerCase().includes(q);
    });
  }, [binaryView, logs, onlyJson, searchText, showIn, showOut, showSystem]);

  const send = useCallback(async () => {
    setError(null);
    if (status !== 'connected') {
      setError('当前未连接');
      return;
    }

    const payload = message;
    if (!payload.trim()) return;

    let outKind: LogKind = 'text';
    let outText: string | undefined;
    let outPretty: string | undefined;
    let outBytes: Uint8Array | undefined;

    if (sendMode === 'json') {
      try {
        const v = JSON.parse(payload);
        outKind = 'json';
        outText = payload;
        outPretty = JSON.stringify(v, null, 2);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(`JSON 无法解析：${msg}`);
        return;
      }
    } else if (sendMode === 'binary') {
      try {
        outBytes = binaryInputFormat === 'hex' ? hexToBytes(payload) : base64ToBytes(payload);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(`二进制解析失败：${msg}`);
        return;
      }
      outKind = 'binary';
    } else {
      outKind = 'text';
      outText = payload;
    }

    try {
      if (connMode === 'extension') {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error('WebSocket 未处于可发送状态');

        if (outKind === 'binary') ws.send(outBytes!);
        else ws.send(outText!);
      } else {
        if (outKind === 'binary') {
          const b64 = bytesToBase64(outBytes!);
          const res = await devtoolsEval<{ ok: boolean; error?: string }>(buildPageSendBinaryExpression(b64));
          if (!res?.ok) throw new Error(res?.error || '页面上下文发送失败');
        } else {
          const res = await devtoolsEval<{ ok: boolean; error?: string }>(buildPageSendTextExpression(outText!));
          if (!res?.ok) throw new Error(res?.error || '页面上下文发送失败');
        }
      }

      if (outKind === 'binary') addLog({ direction: 'out', kind: 'binary', bytes: outBytes });
      else if (outKind === 'json') addLog({ direction: 'out', kind: 'json', text: outText, jsonPretty: outPretty });
      else addLog({ direction: 'out', kind: 'text', text: outText });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`发送失败：${msg}`);
      addLog({ direction: 'system', kind: 'text', text: `发送失败：${msg}` });
    }
  }, [addLog, binaryInputFormat, connMode, message, sendMode, status]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setCopied(false);
  }, []);

  const copyLogs = useCallback(async () => {
    const lines = filteredLogs.map((l) => {
      const dir = l.direction.toUpperCase();
      const kind = l.kind.toUpperCase();

      let body = '';
      if (l.kind === 'binary' && l.bytes) {
        body =
          binaryView === 'base64'
            ? bytesToBase64(l.bytes)
            : binaryView === 'utf8'
              ? bytesToUtf8(l.bytes)
              : bytesToHex(l.bytes);
      } else if (l.kind === 'json' && jsonPrettyView && l.jsonPretty) {
        body = l.jsonPretty;
      } else {
        body = l.text || '';
      }

      return `[${formatTime(l.ts)}] ${dir}/${kind}: ${body}`;
    });

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, [binaryView, filteredLogs, jsonPrettyView]);

  const statusBadge = useMemo(() => {
    switch (status) {
      case 'connected':
        return { label: '已连接', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
      case 'connecting':
        return { label: '连接中', cls: 'bg-amber-50 text-amber-700 border-amber-100' };
      case 'error':
        return { label: '错误', cls: 'bg-rose-50 text-rose-700 border-rose-100' };
      default:
        return { label: '未连接', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  }, [status]);

  // Auto-scroll (unless paused)
  useEffect(() => {
    if (pauseScroll) return;
    logEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [logs.length, pauseScroll]);

  // Heartbeat (silent, no log)
  useEffect(() => {
    if (heartbeatTimerRef.current) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    if (status !== 'connected' || !heartbeatEnabled) return;

    const intervalRaw = Number.isFinite(heartbeatIntervalMs) ? heartbeatIntervalMs : 30000;
    const interval = Math.max(1000, Math.floor(intervalRaw));

    heartbeatTimerRef.current = window.setInterval(() => {
      void (async () => {
        try {
          if (connMode === 'extension') {
            const ws = wsRef.current;
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            ws.send(heartbeatPayload);
          } else {
            await devtoolsEval(buildPageSendTextExpression(heartbeatPayload));
          }
        } catch {
          // Non-fatal. Close/error handlers may trigger reconnect.
        }
      })();
    }, interval);

    return () => {
      if (heartbeatTimerRef.current) {
        window.clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [connMode, heartbeatEnabled, heartbeatIntervalMs, heartbeatPayload, status]);

  // Turning auto-reconnect off should cancel pending timer.
  useEffect(() => {
    if (!autoReconnect) clearReconnectTimer();
  }, [autoReconnect, clearReconnectTimer]);

  useEffect(() => {
    return () => {
      try {
        wsRef.current?.close(1000, 'unmount');
      } catch {
        // ignore
      }
      wsRef.current = null;

      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (heartbeatTimerRef.current) window.clearInterval(heartbeatTimerRef.current);
      if (pagePollTimerRef.current) window.clearInterval(pagePollTimerRef.current);
    };
  }, []);

  const changeConnMode = useCallback(
    (next: ConnMode) => {
      if (next === connMode) return;
      if (next === 'page' && !devtoolsSupported) return;

      void (async () => {
        if (status === 'connected' || status === 'connecting') {
          await disconnect({ silent: true });
        }
        setConnMode(next);
      })();
    },
    [connMode, devtoolsSupported, disconnect, status]
  );

  const connectButton = status === 'disconnected' || status === 'error';

  return (
    <ToolPageShell>
      <ToolHeader
        title="WebSocket 调试"
        description="连接、发送与接收消息（重连/心跳/过滤/二进制/页面上下文）"
        icon={<Cable className="w-5 h-5" />}
        iconClassName="bg-sky-50 text-sky-700"
        actions={
          <>
            <button
              onClick={copyLogs}
              disabled={filteredLogs.length === 0}
              className={cn(
                'btn btn-secondary gap-2',
                filteredLogs.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              )}
              title="复制当前可见日志"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>复制日志</span>
                </>
              )}
            </button>

            <button onClick={clearLogs} className="btn btn-ghost p-2 text-slate-400 hover:text-rose-500" title="清空日志">
              <Trash2 className="w-5 h-5" />
            </button>
          </>
        }
        toolbar={
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[16rem]">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="wss://example.com/ws"
                  className="input-base font-mono"
                  spellCheck={false}
                />
              </div>

              <div className="flex items-center gap-2">
                {connectButton ? (
                  <button onClick={() => connect(true)} className="btn btn-primary gap-2">
                    <PlugZap className="w-4 h-4" />
                    <span>连接</span>
                  </button>
                ) : (
                  <button onClick={() => void disconnect()} className="btn btn-secondary gap-2">
                    <Plug className="w-4 h-4" />
                    <span>断开</span>
                  </button>
                )}

                <span
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap',
                    statusBadge.cls
                  )}
                >
                  {statusBadge.label}
                </span>

                {autoReconnect && reconnectAttempts > 0 ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-200 whitespace-nowrap">
                    重连 {reconnectAttempts}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">连接模式</span>
                <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                  <button
                    onClick={() => changeConnMode('extension')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      connMode === 'extension'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    扩展面板
                  </button>
                  <button
                    onClick={() => changeConnMode('page')}
                    disabled={!devtoolsSupported}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      connMode === 'page'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : devtoolsSupported
                          ? 'text-slate-500 hover:text-slate-700'
                          : 'text-slate-300 cursor-not-allowed'
                    )}
                    title={devtoolsSupported ? '使用页面上下文（更接近真实环境）' : '仅 DevTools 面板可用'}
                  >
                    页面上下文（实验）
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-600 select-none">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={autoReconnect}
                    onChange={(e) => setAutoReconnect(e.target.checked)}
                  />
                  <span className="inline-flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5" />
                    自动重连
                  </span>
                </label>
                <input
                  type="number"
                  min={200}
                  step={100}
                  value={reconnectIntervalMs}
                  onChange={(e) => setReconnectIntervalMs(Number(e.target.value))}
                  className="input-base w-28 text-xs"
                  title="重连间隔（毫秒）"
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={maxReconnectAttempts}
                  onChange={(e) => setMaxReconnectAttempts(Number(e.target.value))}
                  className="input-base w-24 text-xs"
                  title="最大重连次数（0=无限）"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-600 select-none">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={heartbeatEnabled}
                    onChange={(e) => setHeartbeatEnabled(e.target.checked)}
                  />
                  <span className="inline-flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    心跳
                  </span>
                </label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={heartbeatIntervalMs}
                  onChange={(e) => setHeartbeatIntervalMs(Number(e.target.value))}
                  className="input-base w-28 text-xs"
                  title="心跳间隔（毫秒）"
                />
                <input
                  value={heartbeatPayload}
                  onChange={(e) => setHeartbeatPayload(e.target.value)}
                  className="input-base w-40 text-xs font-mono"
                  placeholder="ping"
                  title="心跳发送内容（文本）"
                />
              </div>
            </div>

            <div className="text-xs text-slate-500 leading-5">
              限制说明：浏览器 WebSocket API 基本无法自定义握手 Headers；“扩展面板”模式的 Origin 为扩展页面，
              某些服务会拒绝。需要携带页面 Cookie/Origin 时可尝试“页面上下文（实验）”（仅 DevTools 面板可用）。
            </div>

            {error ? (
              <div className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="break-all">{error}</span>
              </div>
            ) : null}
          </div>
        }
      />

      <ToolMain className="overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[420px_1fr] min-h-0">
          {/* 左侧：发送区 */}
          <section className="min-h-0 p-6 border-b lg:border-b-0 lg:border-r border-slate-100 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">发送消息</div>
                  <div className="text-xs text-slate-500 mt-0.5">快捷键：Ctrl + Enter 发送</div>
                </div>

                <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                  <button
                    onClick={() => setSendMode('text')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      sendMode === 'text'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    Text
                  </button>
                  <button
                    onClick={() => setSendMode('json')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      sendMode === 'json'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => setSendMode('binary')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      sendMode === 'binary'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    Binary
                  </button>
                </div>
              </div>

              {sendMode === 'binary' ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    输入格式：
                    <span className="ml-1 font-mono text-slate-700">{binaryInputFormat.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                    <button
                      onClick={() => setBinaryInputFormat('base64')}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        binaryInputFormat === 'base64'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      )}
                    >
                      Base64
                    </button>
                    <button
                      onClick={() => setBinaryInputFormat('hex')}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        binaryInputFormat === 'hex'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      )}
                    >
                      Hex
                    </button>
                  </div>
                </div>
              ) : null}

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={
                  sendMode === 'json'
                    ? '{\n  \"hello\": \"world\"\n}'
                    : sendMode === 'binary'
                      ? binaryInputFormat === 'hex'
                        ? '0a0b0c0d'
                        : 'AAECAwQ='
                      : 'Hello WebSocket'
                }
                className="w-full h-56 p-4 border border-slate-200 rounded-2xl resize-none font-mono text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-300 bg-white"
                spellCheck={false}
              />

              <button
                onClick={() => void send()}
                disabled={status !== 'connected' || !message.trim()}
                className={cn(
                  'btn btn-primary w-full gap-2',
                  status !== 'connected' || !message.trim() ? 'opacity-50 cursor-not-allowed' : ''
                )}
              >
                <Send className="w-4 h-4" />
                <span>发送</span>
              </button>

              <div className="text-xs text-slate-500 leading-5">
                {sendMode === 'json'
                  ? '提示：JSON 模式会先校验语法（仅校验，不会改写你的内容）。'
                  : sendMode === 'binary'
                    ? '提示：Binary 模式会将输入解析为字节序列后发送。'
                    : '提示：Text 模式按原文发送。'}
              </div>
            </div>
          </section>

          {/* 右侧：日志 */}
          <section className="min-h-0 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-white space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">消息日志</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPauseScroll((v) => !v)}
                    className="btn btn-ghost px-3 py-1.5 text-xs gap-2"
                    title={pauseScroll ? '恢复自动滚动' : '暂停自动滚动'}
                  >
                    {pauseScroll ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    <span>{pauseScroll ? '继续滚动' : '暂停滚动'}</span>
                  </button>
                  <div className="text-xs text-slate-400">
                    {filteredLogs.length}/{logs.length} 条
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="搜索消息…"
                    className="input-base pl-9 w-64 text-xs"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowIn((v) => !v)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
                      showIn
                        ? 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100'
                        : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    IN
                  </button>
                  <button
                    onClick={() => setShowOut((v) => !v)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
                      showOut
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                        : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    OUT
                  </button>
                  <button
                    onClick={() => setShowSystem((v) => !v)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
                      showSystem
                        ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    SYS
                  </button>
                </div>

                <button
                  onClick={() => setOnlyJson((v) => !v)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
                    onlyJson
                      ? 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  )}
                  title="只显示 JSON 消息"
                >
                  只看 JSON
                </button>

                <button
                  onClick={() => setJsonPrettyView((v) => !v)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
                    jsonPrettyView
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  )}
                  title="JSON 展示为美化/原文"
                >
                  JSON 美化
                </button>

                <select
                  value={binaryView}
                  onChange={(e) => setBinaryView(e.target.value as 'hex' | 'base64' | 'utf8')}
                  className="input-base w-32 text-xs"
                  title="Binary 展示格式"
                >
                  <option value="hex">Binary: Hex</option>
                  <option value="base64">Binary: Base64</option>
                  <option value="utf8">Binary: UTF-8</option>
                </select>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-slate-50">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Cable className="w-10 h-10 mb-3 opacity-30" />
                  <div className="text-sm">还没有消息</div>
                  <div className="text-xs mt-1">连接后发送一条试试</div>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <div className="text-sm">没有匹配的日志</div>
                  <div className="text-xs mt-1">尝试调整过滤条件</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLogs.map((l) => {
                    const dirBadge =
                      l.direction === 'in'
                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                        : l.direction === 'out'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-slate-100 text-slate-700 border-slate-200';

                    const kindBadge =
                      l.kind === 'json'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        : l.kind === 'binary'
                          ? 'bg-cyan-50 text-cyan-700 border-cyan-100'
                          : 'bg-white text-slate-500 border-slate-200';

                    let body = '';
                    if (l.kind === 'binary' && l.bytes) {
                      body =
                        binaryView === 'base64'
                          ? bytesToBase64(l.bytes)
                          : binaryView === 'utf8'
                            ? bytesToUtf8(l.bytes)
                            : formatHexLines(l.bytes);
                    } else if (l.kind === 'json' && jsonPrettyView && l.jsonPretty) {
                      body = l.jsonPretty;
                    } else {
                      body = l.text || '';
                    }

                    return (
                      <div
                        key={l.id}
                        className="bg-white border border-slate-100 rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden"
                      >
                        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold border', dirBadge)}>
                              {l.direction.toUpperCase()}
                            </span>
                            <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold border', kindBadge)}>
                              {l.kind.toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{formatTime(l.ts)}</span>
                            {l.kind === 'binary' && l.bytes ? (
                              <span className="text-xs text-slate-400 font-mono">{l.bytes.length} bytes</span>
                            ) : null}
                          </div>

                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(body);
                            }}
                            className="text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors"
                            title="复制内容"
                          >
                            复制
                          </button>
                        </div>

                        <pre className="p-4 text-[13px] leading-relaxed font-mono text-slate-700 whitespace-pre-wrap break-words">
                          {body}
                        </pre>
                      </div>
                    );
                  })}
                  <div ref={logEndRef} />
                </div>
              )}
            </div>
          </section>
        </div>
      </ToolMain>
    </ToolPageShell>
  );
}
