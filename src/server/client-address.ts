import { isIPv4, isIPv6 } from "node:net";

/**
 * The part of a client address that identifies one "visitor" for rate limiting.
 *
 * IPv4 addresses are used as they are. An IPv6 address is reduced to its /64
 * prefix: a home or mobile connection normally owns a whole /64 (about 1.8e19
 * addresses), so limiting per full address would let one visitor switch to a
 * fresh address for every attempt. IPv4-mapped IPv6 addresses (::ffff:a.b.c.d)
 * are treated as the IPv4 address they carry. Anything that isn't an IP address
 * returns undefined, so the caller falls back to its shared bucket.
 */
export function rateLimitAddress(raw: string): string | undefined {
  let value = raw.trim();
  if (value.startsWith("[") && value.endsWith("]")) value = value.slice(1, -1);
  const zone = value.indexOf("%");
  if (zone !== -1) value = value.slice(0, zone);

  if (isIPv4(value)) return value;
  if (!isIPv6(value)) return undefined;

  const groups = expandIPv6(value);
  if (!groups) return undefined;

  const mapped =
    groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff;
  if (mapped) {
    const [hi = 0, lo = 0] = groups.slice(6);
    return `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
  }
  return `${groups
    .slice(0, 4)
    .map((g) => g.toString(16))
    .join(":")}::/64`;
}

/** The eight 16-bit groups of a valid IPv6 address, or null if it can't be read. */
function expandIPv6(address: string): number[] | null {
  let text = address.toLowerCase();

  // A trailing dotted IPv4 part (::ffff:1.2.3.4) is two groups.
  const lastColon = text.lastIndexOf(":");
  const tail = text.slice(lastColon + 1);
  if (tail.includes(".")) {
    const octets = tail.split(".").map(Number);
    if (octets.length !== 4 || octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return null;
    const [a = 0, b = 0, c = 0, d = 0] = octets;
    text = `${text.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }

  const halves = text.split("::");
  if (halves.length > 2) return null;
  const parse = (part: string | undefined) => (part ? part.split(":") : []);
  const head = parse(halves[0]);
  const rest = parse(halves[1]);
  const fill = halves.length === 2 ? 8 - head.length - rest.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return null;

  const groups = [...head, ...Array<string>(fill).fill("0"), ...rest].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null;
}
