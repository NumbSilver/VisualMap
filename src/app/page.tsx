import { Suspense } from "react";
import { VisualMapApp } from "./visual-map-app";

export default function Page() {
  return (
    <Suspense fallback={<main className="visual-shell" />}>
      <VisualMapApp />
    </Suspense>
  );
}
