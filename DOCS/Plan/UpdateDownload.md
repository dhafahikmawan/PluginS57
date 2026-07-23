# Update Download Behavior

## Goal
Update the plugin download function so that when more than one file is loaded, the output is a ZIP archive containing ZIP files for each converted file.

## Background
The current download behavior likely returns a single converted file directly when only one file is loaded. When multiple files are loaded, users need a single download package that preserves each converted file separately.

## Requirements
1. Detect how many files are currently loaded for conversion.
2. For a single loaded file:
   - Keep existing behavior unless another UX change is desired.
3. For multiple loaded files:
   - Package each converted file as its own ZIP archive.
   - Create an outer ZIP archive containing all individual converted-file ZIPs.
   - Preserve clear naming for each inner ZIP to reflect its original source file.

## Design Considerations
- Use a reliable client-side ZIP library already present in the project or add one if necessary.
- Ensure file names are sanitized and unique in the outer archive.
- Maintain consistent download metadata (e.g. content type, download filename).
- Consider file size and browser memory limits when generating nested ZIPs.

## Implementation Steps
1. Identify the download entrypoint in the plugin codebase. Likely in `src/geolibre.ts` or a download helper module.
2. Find or add a utility method to build ZIP archives from file content.
3. Add logic that inspects loaded files count:
   - `count === 1` -> existing direct-download path.
   - `count > 1` -> new nested ZIP creation path.
4. For each converted file:
   - Create the converted file output.
   - Package it into an inner ZIP archive named after the source file (e.g. `source-file-converted.zip`).
   - Add the inner ZIP to the outer ZIP container.
5. Trigger the download for the outer ZIP archive (e.g. `all-converted-files.zip`).
6. Add tests covering:
   - single-file behavior remains unchanged.
   - multiple-file behavior produces an outer ZIP containing correctly named inner ZIP entries.
   - naming and file count expectations.

## Testing
- Unit test the download helper logic and ZIP creation routine.
- Manual test with multiple loaded files in the UI to confirm browser download of nested ZIP structure.
- Verify edge cases such as duplicate source file names and empty conversion results.

## Notes
- If the project already uses a ZIP utility in other code, reuse it to keep dependencies consistent.
- If nested ZIP archives are not desirable for some reason, document the alternative of a single outer ZIP containing raw converted files directly.
