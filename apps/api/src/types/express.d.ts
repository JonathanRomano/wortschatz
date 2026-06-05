// Ambient augmentation of Express's `Request` with the fields our middleware
// attaches. We extend the global `Express` namespace — the public, documented
// extension point that @types/express owns — instead of
// `declare module "express-serve-static-core"`.
//
// Why: @types/express's `Request` extends `Express.Request` (the global
// namespace), so adding members here propagates to every `Request` imported
// from "express". Crucially this never names the transitive
// @types/express-serve-static-core package, so it doesn't depend on that
// package being hoisted to a location resolvable from apps/api — which strict
// pnpm / clean Docker installs (no shamefully-hoist) don't guarantee.
//
// This is a declaration-only file: tsc emits nothing for it, so there is no
// runtime effect.
import "express";

declare global {
  namespace Express {
    interface Request {
      /** Acting user id, set by sharedSecretAuth from the X-User-Id header. */
      userId?: string;
    }
  }
}
