/** Resolve somente caminhos internos; fallback é definido pelo chamador, nunca pela URL. */
export function internalRedirect(
  next: string | null,
  requestUrl: string,
  fallback: '/login' | '/auth/accept-invite'
): URL {
  const origin = new URL(requestUrl).origin
  const defaultUrl = new URL(fallback, origin)

  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return defaultUrl
  }

  // O parser WHATWG normaliza contrabarras e remove alguns controles.
  // Rejeite também separadores/controles codificados e dupla codificação no path.
  const path = next.split(/[?#]/, 1)[0]
  if (
    next.includes('\\') ||
    Array.from(next).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) ||
    /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f|25)/i.test(path)
  ) {
    return defaultUrl
  }

  try {
    const destination = new URL(next, origin)
    if (destination.origin !== origin || destination.pathname.startsWith('//')) {
      return defaultUrl
    }
    return destination
  } catch {
    return defaultUrl
  }
}
