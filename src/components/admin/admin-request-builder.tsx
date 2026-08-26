'use client';

import {
  getEndpointsForMethod,
  resourceTypeFromPath,
  type HttpMethod
} from '@/lib/admin/endpoints';
import {
  buildQueryString,
  buildResourcePayload,
  createParamRow,
  getFieldSchemas,
  type AdminField,
  type QueryParamRow
} from '@/lib/admin/payload';
import { adminRequest, parseAdminKeyError } from '@/services/admin-api';
import { useState } from 'react';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE'];

/** One editable field row bound to a dynamic schema field. */
function FieldRow({
  field,
  value,
  onChange
}: Readonly<{
  field: AdminField;
  value: string;
  onChange: (v: string) => void;
}>) {
  return (
    <label className='flex flex-col gap-1 text-sm'>
      <span className='font-medium capitalize'>{field.label}</span>
      <input
        aria-label={field.label}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder ?? field.key}
        className='rounded-md border border-slate-300 px-3 py-1.5 font-mono text-xs'
      />
    </label>
  );
}

/** Dynamic key/value rows for GET query parameters. */
function QueryParamRows({
  rows,
  onChange
}: Readonly<{
  rows: QueryParamRow[];
  onChange: (rows: QueryParamRow[]) => void;
}>) {
  const update = (id: string, patch: Partial<QueryParamRow>) => {
    onChange(rows.map(row => (row.id === id ? { ...row, ...patch } : row)));
  };
  return (
    <div className='flex flex-col gap-2'>
      {rows.map((row, i) => (
        <div key={row.id} className='flex gap-2'>
          <input
            aria-label={`param key ${i + 1}`}
            value={row.key}
            onChange={e => update(row.id, { key: e.target.value })}
            placeholder='key'
            className='w-1/2 rounded-md border border-slate-300 px-3 py-1.5 font-mono text-xs'
          />
          <input
            aria-label={`param value ${i + 1}`}
            value={row.value}
            onChange={e => update(row.id, { value: e.target.value })}
            placeholder='value'
            className='w-1/2 rounded-md border border-slate-300 px-3 py-1.5 font-mono text-xs'
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Dynamic superadmin request builder: method, endpoint, payload fields and a
 * read-only preview of the constructed request.
 */
export function AdminRequestBuilder() {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [endpoint, setEndpoint] = useState('/fhir/Organization');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [rawJson, setRawJson] = useState('');
  const [params, setParams] = useState<QueryParamRow[]>([]);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const resourceType = resourceTypeFromPath(endpoint);
  const schema = getFieldSchemas(resourceType);
  const needsPayload = method === 'POST' || method === 'PUT';

  const changeEndpoint = (value: string) => {
    setEndpoint(value);
    setFieldValues({});
    setRawJson('');
    setParams([]);
    setResult(null);
    setError('');
  };

  const payload = needsPayload
    ? buildResourcePayload(resourceType ?? '', fieldValues, rawJson)
    : null;

  const previewText = needsPayload
    ? JSON.stringify(payload, null, 2)
    : endpoint + buildQueryString(params);

  const handleSend = async () => {
    setSending(true);
    setError('');
    setResult(null);
    try {
      const url = needsPayload ? endpoint : endpoint + buildQueryString(params);
      const data = needsPayload && payload ? payload : undefined;
      const response = await adminRequest(method, url, data);
      setResult(response as Record<string, unknown>);
    } catch (err) {
      setError(parseAdminKeyError(err));
    } finally {
      setSending(false);
    }
  };

  const endpointOptions = getEndpointsForMethod(method);

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-end gap-3'>
        <label className='flex flex-col gap-1 text-sm'>
          <span className='font-medium'>Method</span>
          <select
            aria-label='Method'
            value={method}
            onChange={e => {
              setMethod(e.target.value as HttpMethod);
              setResult(null);
            }}
            className='rounded-md border border-slate-300 px-3 py-1.5'
          >
            {METHODS.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className='flex min-w-[18rem] grow flex-col gap-1 text-sm'>
          <span className='font-medium'>Endpoint</span>
          <input
            aria-label='Endpoint'
            list='admin-endpoints'
            value={endpoint}
            onChange={e => changeEndpoint(e.target.value)}
            className='rounded-md border border-slate-300 px-3 py-1.5 font-mono text-xs'
          />
          <datalist id='admin-endpoints'>
            {endpointOptions.map(opt => (
              <option key={opt.path} value={opt.path} />
            ))}
          </datalist>
        </label>
      </div>

      {needsPayload && schema.length > 0 && (
        <div className='grid grid-cols-2 gap-3'>
          {schema.map(field => (
            <FieldRow
              key={field.key}
              field={field}
              value={fieldValues[field.key] ?? ''}
              onChange={v =>
                setFieldValues(prev => ({ ...prev, [field.key]: v }))
              }
            />
          ))}
        </div>
      )}

      {needsPayload && (
        <label className='flex flex-col gap-1 text-sm'>
          <span className='font-medium'>Raw JSON escape hatch (merged)</span>
          <textarea
            aria-label='Raw JSON escape hatch'
            value={rawJson}
            onChange={e => setRawJson(e.target.value)}
            rows={3}
            placeholder='{"extension":[...]} — merged over the fields above'
            className='rounded-md border border-slate-300 px-3 py-1.5 font-mono text-xs'
          />
        </label>
      )}

      {method === 'GET' && (
        <div className='flex flex-col gap-2'>
          <span className='text-sm font-medium'>Query parameters</span>
          <QueryParamRows rows={params} onChange={setParams} />
          <button
            type='button'
            onClick={() => setParams(prev => [...prev, createParamRow()])}
            className='self-start rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100'
          >
            + Add param
          </button>
        </div>
      )}

      <label className='flex flex-col gap-1 text-sm'>
        <span className='font-medium'>Payload preview (read-only)</span>
        <textarea
          aria-label='Payload preview'
          readOnly
          wrap='off'
          value={previewText}
          rows={Math.max(3, previewText.split('\n').length)}
          className='overflow-x-auto rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 font-mono text-xs whitespace-pre'
        />
      </label>

      {error && <p className='text-sm text-red-600'>{error}</p>}
      {result && (
        <pre className='overflow-x-auto rounded-md bg-slate-900 p-3 font-mono text-xs text-emerald-300'>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <button
        type='button'
        onClick={() => void handleSend()}
        disabled={sending || !endpoint.trim()}
        className='self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50'
      >
        {sending ? 'Sending…' : 'Send'}
      </button>
    </div>
  );
}
