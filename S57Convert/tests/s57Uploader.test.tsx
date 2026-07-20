import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { S57Uploader } from "../src/lib/components/S57Uploader";

describe("S57Uploader", () => {
  it("renders the refined status and hero content", () => {
    const { container } = render(
      <S57Uploader onLayersLoaded={() => undefined} onClearLayers={() => undefined} />,
    );

    expect(container.querySelector(".s57-panel-badge")?.textContent).toBe("Ready");
    expect(container.querySelector(".s57-panel-card")?.textContent).toContain("Upload S-57 (.000) File");
    expect(container.textContent).toContain("S-57 Marine Chart Loader");
  });
});
