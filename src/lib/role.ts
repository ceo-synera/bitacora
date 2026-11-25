/** ¿La sesión actual es de un lector (solo lectura)? Lo define AuthGate al entrar. */
let readOnly = false;
const ls = new Set<() => void>();

export function isReadOnly() {
  return readOnly;
}

export function setReadOnly(v: boolean) {
  readOnly = v;
  ls.forEach((f) => f());
}

export function subscribeRole(cb: () => void) {
  ls.add(cb);
  return () => {
    ls.delete(cb);
  };
}
