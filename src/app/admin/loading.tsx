// Blocks the public-site skeleton in the root `loading.tsx` from flashing on admin navigations —
// admin's own layout already does its own (fast) auth check before rendering.
export default function Loading() {
  return null;
}
