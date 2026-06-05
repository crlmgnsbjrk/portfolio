const REALM = "portfolio";
const DEFAULT_PASSWORD_SHA256 = "0af64fce2406332d6d28244cfd0871e8ec534710b7e68e8ce8b147a49465c580";

export default async function middleware(request) {
  const username = process.env.SITE_USERNAME || "studio";
  const passwordHash = process.env.SITE_PASSWORD_SHA256 || DEFAULT_PASSWORD_SHA256;

  if (!passwordHash) {
    return unauthorized();
  }

  const authorization = request.headers.get("authorization");

  if (authorization && await isValidBasicAuth(authorization, username, passwordHash)) {
    return;
  }

  return unauthorized();
}

async function isValidBasicAuth(authorization, username, passwordHash) {
  const [scheme, encoded] = authorization.split(" ");

  if (scheme !== "Basic" || !encoded) {
    return false;
  }

  const decoded = atob(encoded);
  const separator = decoded.indexOf(":");

  if (separator === -1) {
    return false;
  }

  const submittedUsername = decoded.slice(0, separator);
  const submittedPassword = decoded.slice(separator + 1);
  const submittedPasswordHash = await sha256(submittedPassword);

  return submittedUsername === username && timingSafeEqual(submittedPasswordHash, passwordHash);
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}

function unauthorized() {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  matcher: ["/(.*)"],
};
