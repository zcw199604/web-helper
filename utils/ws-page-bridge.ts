/**
 * DevTools inspected page WebSocket bridge (experimental).
 *
 * This uses `chrome.devtools.inspectedWindow.eval` to create a WebSocket in the
 * inspected page context, then polls buffered events back into the panel.
 *
 * Notes:
 * - Only available when running inside a DevTools panel.
 * - Avoids needing a content-script relay, but requires polling.
 */

export type PageEvent =
  | { ts: number; type: 'open' }
  | { ts: number; type: 'error' }
  | { ts: number; type: 'close'; code: number; reason: string }
  | { ts: number; type: 'message'; kind: 'text' | 'binary'; data: string };

export type PagePollPayload = {
  hasState: boolean;
  readyState: number;
  events: PageEvent[];
};

export const PAGE_WS_KEY = '__WEBHELPER_WS__';

export function hasDevtoolsEval(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    !!chrome.devtools &&
    !!chrome.devtools.inspectedWindow &&
    typeof chrome.devtools.inspectedWindow.eval === 'function'
  );
}

export function devtoolsEval<T>(expression: string): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!hasDevtoolsEval()) {
      reject(new Error('当前环境不支持 DevTools inspectedWindow.eval'));
      return;
    }

    chrome.devtools.inspectedWindow.eval(expression, (result: unknown, exceptionInfo: any) => {
      if (exceptionInfo && exceptionInfo.isException) {
        const msg =
          typeof exceptionInfo.value === 'string'
            ? exceptionInfo.value
            : typeof exceptionInfo.description === 'string'
              ? exceptionInfo.description
              : 'DevTools eval 执行异常';
        reject(new Error(msg));
        return;
      }
      resolve(result as T);
    });
  });
}

export function buildPageConnectExpression(url: string): string {
  const key = JSON.stringify(PAGE_WS_KEY);
  const urlLiteral = JSON.stringify(url);

  // Keep this string self-contained and relatively small; it runs in the inspected page.
  return `(function(){\n` +
    `  const KEY=${key};\n` +
    `  const root=window;\n` +
    `  const st=root[KEY] || (root[KEY]={seq:0,events:[],socket:null});\n` +
    `  st.seq=(st.seq||0)+1;\n` +
    `  const seq=st.seq;\n` +
    `  if(st.socket){try{st.socket.close(1000,'reconnect');}catch(e){}}\n` +
    `  const ws=new WebSocket(${urlLiteral});\n` +
    `  ws.binaryType='arraybuffer';\n` +
    `  st.socket=ws;\n` +
    `  function push(ev){\n` +
    `    try{ st.events.push(ev); const max=500; if(st.events.length>max) st.events.splice(0, st.events.length-max); }catch(e){}\n` +
    `  }\n` +
    `  function toB64(buf){\n` +
    `    const bytes=new Uint8Array(buf);\n` +
    `    let bin='';\n` +
    `    const chunk=0x8000;\n` +
    `    for(let i=0;i<bytes.length;i+=chunk){ bin+=String.fromCharCode.apply(null, bytes.subarray(i,i+chunk)); }\n` +
    `    return btoa(bin);\n` +
    `  }\n` +
    `  ws.onopen=function(){ if(st.seq!==seq) return; push({ts:Date.now(),type:'open'}); };\n` +
    `  ws.onerror=function(){ if(st.seq!==seq) return; push({ts:Date.now(),type:'error'}); };\n` +
    `  ws.onclose=function(e){ if(st.seq!==seq) return; st.socket=null; push({ts:Date.now(),type:'close',code:e.code,reason:e.reason||''}); };\n` +
    `  ws.onmessage=function(e){\n` +
    `    if(st.seq!==seq) return;\n` +
    `    const d=e.data;\n` +
    `    if(typeof d==='string'){ push({ts:Date.now(),type:'message',kind:'text',data:d}); return; }\n` +
    `    if(d instanceof ArrayBuffer){ push({ts:Date.now(),type:'message',kind:'binary',data:toB64(d)}); return; }\n` +
    `    if(d && typeof d==='object' && typeof d.arrayBuffer==='function'){\n` +
    `      d.arrayBuffer().then(function(buf){ if(st.seq!==seq) return; push({ts:Date.now(),type:'message',kind:'binary',data:toB64(buf)}); }).catch(function(){});\n` +
    `    }\n` +
    `  };\n` +
    `  return {ok:true};\n` +
    `})()`;
}

export function buildPageDisconnectExpression(): string {
  const key = JSON.stringify(PAGE_WS_KEY);
  return `(function(){\n` +
    `  const KEY=${key};\n` +
    `  const st=window[KEY];\n` +
    `  if(!st) return {ok:true};\n` +
    `  st.seq=(st.seq||0)+1;\n` +
    `  if(st.socket){try{st.socket.close(1000,'manual close');}catch(e){}}\n` +
    `  st.socket=null;\n` +
    `  return {ok:true};\n` +
    `})()`;
}

export function buildPageSendTextExpression(payload: string): string {
  const key = JSON.stringify(PAGE_WS_KEY);
  const payloadLiteral = JSON.stringify(payload);
  return `(function(){\n` +
    `  const KEY=${key};\n` +
    `  const st=window[KEY];\n` +
    `  const ws=st && st.socket;\n` +
    `  if(!ws || ws.readyState!==1) return {ok:false,error:'not connected'};\n` +
    `  ws.send(${payloadLiteral});\n` +
    `  return {ok:true};\n` +
    `})()`;
}

export function buildPageSendBinaryExpression(base64: string): string {
  const key = JSON.stringify(PAGE_WS_KEY);
  const b64Literal = JSON.stringify(base64);
  return `(function(){\n` +
    `  const KEY=${key};\n` +
    `  const st=window[KEY];\n` +
    `  const ws=st && st.socket;\n` +
    `  if(!ws || ws.readyState!==1) return {ok:false,error:'not connected'};\n` +
    `  function fromB64(b64){\n` +
    `    const bin=atob(b64);\n` +
    `    const bytes=new Uint8Array(bin.length);\n` +
    `    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);\n` +
    `    return bytes;\n` +
    `  }\n` +
    `  const bytes=fromB64(${b64Literal});\n` +
    `  ws.send(bytes);\n` +
    `  return {ok:true,size:bytes.length};\n` +
    `})()`;
}

export function buildPagePollExpression(): string {
  const key = JSON.stringify(PAGE_WS_KEY);
  return `(function(){\n` +
    `  const KEY=${key};\n` +
    `  const st=window[KEY];\n` +
    `  if(!st || !Array.isArray(st.events)) return JSON.stringify({hasState:false,readyState:-1,events:[]});\n` +
    `  const evs=st.events.splice(0, st.events.length);\n` +
    `  const rs=st.socket ? st.socket.readyState : -1;\n` +
    `  try{ return JSON.stringify({hasState:true,readyState:rs,events:evs}); }catch(e){ return JSON.stringify({hasState:true,readyState:rs,events:[]}); }\n` +
    `})()`;
}
