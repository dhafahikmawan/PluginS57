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
    expect(container.querySelector("label[for='s57-file-input']")?.textContent).toContain("Upload S-57 (.000) File");
    expect(container.textContent).toContain("S-57 Marine Chart Loader");
  });

  it("defaults to API conversion mode and the documented endpoint", () => {
    const { container } = render(
      <S57Uploader onLayersLoaded={() => undefined} onClearLayers={() => undefined} />,
    );

    const modeSelect = container.querySelector("#s57-mode-select") as HTMLSelectElement | null;
    const endpointInput = container.querySelector("#api-endpoint") as HTMLInputElement | null;

    expect(modeSelect?.value).toBe("api");
    expect(endpointInput?.value).toBe("http://localhost:3000/s57-geojson");
  });
});
