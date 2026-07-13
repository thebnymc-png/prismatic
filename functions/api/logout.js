import { ok, clearCookie } from "../_lib/util.js";
export async function onRequestPost() {
  return ok({}, { headers: { "Set-Cookie": clearCookie() } });
}
