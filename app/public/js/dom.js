// 2026-11-25 - smart-voca - DOM 생성 도우미 (사용자 입력은 textContent로만 넣어 XSS를 막는다)
// 파일 위치: app/public/js/dom.js

const PROPERTY_ATTRS = new Set(['value', 'checked', 'disabled', 'selected']);

export function h(tag, attrs = null, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (PROPERTY_ATTRS.has(key)) node[key] = value;
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function message(text, kind = 'info') {
  return h('p', { class: `msg ${kind}` }, text);
}
