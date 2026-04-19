"use client";

import dynamic from "next/dynamic";

const RelationshipGraph = dynamic(
  () => import("./RelationshipGraph"),
  { ssr: false }
);

export default function RelationshipGraphWrapper() {
  return <RelationshipGraph />;
}
