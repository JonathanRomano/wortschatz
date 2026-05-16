// Global border-radius scale. Buttons/inputs use the global `6` (matches
// the previous `rounded-md`). Cards/Papers bump to 12 via component
// overrides in `index.ts`. Chips opt into 9999 by setting variant="filled"
// + sx={{ borderRadius: 9999 }} or by using the explicit `RADIUS_PILL`
// export below.
export const shape = {
  borderRadius: 6,
};

export const RADIUS_CARD = 12;
export const RADIUS_PILL = 9999;
