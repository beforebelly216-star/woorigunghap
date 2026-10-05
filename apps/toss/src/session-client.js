export function createSessionClient({ apiBase, login, fetcher = fetch, requestTimeoutMs = 20000 }) {
  let token = null;
  let expiresAt = 0;
  let pendingLogin = null;
  let generation = 0;
  const base = apiBase?.replace(/\/$/, '') || '';
  const ready = /^https:\/\/[^/]+$/.test(base) || /^http:\/\/(localhost|127\.0\.0\.1):3000$/.test(base);

  function clear() { token = null; expiresAt = 0; generation += 1; }
  async function request(path, options = {}) {
    if (!ready || !path.startsWith('/api/')) throw new Error('서버 연결 설정이 필요합니다.');
    if (token && Date.now() >= expiresAt) clear();
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    const timer = setTimeout(abort, requestTimeoutMs);
    try {
      const response = await fetcher(base + path, {
        ...options, credentials: 'omit', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const body = await response.json().catch(() => null);
      if (controller.signal.aborted) throw new Error('REQUEST_ABORTED');
      if (response.status === 401) clear();
      if (!response.ok) {
        const error = new Error(response.status === 401 ? '로그인 시간이 만료되었습니다. 다시 로그인해 주세요.' : response.status === 503 ? '서비스 연결을 준비하고 있습니다. 잠시 후 다시 시도해 주세요.' : '요청을 완료하지 못했습니다. 다시 시도해 주세요.');
        error.status = response.status;
        if (typeof body?.error === 'string' && /^[a-z_]{1,80}$/.test(body.error)) error.code = body.error;
        if (body?.fieldErrors && typeof body.fieldErrors === 'object' && !Array.isArray(body.fieldErrors)) {
          error.fieldErrors = Object.fromEntries(Object.entries(body.fieldErrors).filter(([key,value]) => key.length <= 80 && typeof value === 'string' && value.length <= 200).slice(0,20));
        }
        throw error;
      }
      return body;
    } catch (error) {
      if (controller.signal.aborted) throw new Error('연결 시간이 초과되었습니다. 다시 시도해 주세요.');
      throw error;
    } finally {
      clearTimeout(timer); options.signal?.removeEventListener('abort', abort);
    }
  }
  function signIn() {
    if (pendingLogin) return pendingLogin;
    const currentGeneration = generation;
    pendingLogin = (async () => {
      if (!ready) throw new Error('서버 연결 설정이 필요합니다.');
      const { authorizationCode, referrer } = await login();
      const result = await request('/api/auth/toss', { method: 'POST', body: JSON.stringify({ authorizationCode, referrer }) });
      const expiration = Date.parse(result?.expiresAt);
      if (result?.authenticated !== true || !/^[a-f0-9]{64}$/.test(result?.sessionToken)
        || !Number.isFinite(expiration) || expiration <= Date.now()) throw new Error('로그인 응답을 확인하지 못했습니다.');
      if (currentGeneration !== generation) throw new Error('로그인 요청이 취소되었습니다.');
      token = result.sessionToken; expiresAt = expiration;
      const verified = await request('/api/auth/session');
      if (currentGeneration !== generation || verified?.authenticated !== true || !verified?.user) {
        throw new Error('로그인 세션을 확인하지 못했습니다.');
      }
      return verified;
    })().catch(error => {
      clear();
      throw error;
    }).finally(() => { pendingLogin = null; });
    return pendingLogin;
  }
  async function signOut() {
    try { await request('/api/auth/logout', { method: 'POST' }); }
    finally { clear(); }
  }
  return { ready, signIn, signOut, request, clear };
}
