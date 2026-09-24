// Tiny logging helpers with optional ANSI color (disabled when piped or NO_COLOR).
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));

export const bold = wrap("1");
export const dim = wrap("2");
export const red = wrap("31");
export const green = wrap("32");
export const yellow = wrap("33");
export const cyan = wrap("36");

export function info(msg = "") {
  console.log(msg);
}
export function ok(msg) {
  console.log(`${green("ok")} ${msg}`);
}
export function warn(msg) {
  console.warn(`${yellow("!")}  ${msg}`);
}
export function fail(msg) {
  console.error(`${red("x")}  ${msg}`);
}
