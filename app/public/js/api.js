// 2026-11-25 - smart-voca - 서버 API 호출 도우미 (주소는 호출부에서 /api/… 문자열로 받는다)
// 파일 위치: app/public/js/api.js

// 호출부는 "/api/..." 문자열을 그대로 넘긴다. 서버 프록시가 이 문자열을 찾아 서브 경로로 바꿔 준다.
export async function api(method, url, body) {
  const options = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청에 실패했습니다 (${res.status})`);
  return data;
}
