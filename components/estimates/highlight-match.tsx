"use client";

import { Fragment } from "react";

import { splitSearchHighlight } from "@/lib/estimates/line-item-catalogs/search";

export function HighlightMatch({ text, query }: { text: string; query: string }) {
  const parts = splitSearchHighlight(text, query);

  return (
    <>
      {parts.map((part, index) =>
        part.match ? (
          <mark
            key={index}
            className="rounded-sm bg-primary/20 px-0.5 font-semibold text-foreground"
          >
            {part.text}
          </mark>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        )
      )}
    </>
  );
}
