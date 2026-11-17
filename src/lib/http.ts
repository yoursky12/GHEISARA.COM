export function apiError(message: string, status = 422, code = "VALIDATION") {
  return Response.json({ code, message, requestId: crypto.randomUUID() }, { status });
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
