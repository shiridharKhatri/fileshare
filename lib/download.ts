/**
 * Helper to download a file with visual loader state.
 */
export async function downloadFileWithLoader(
  url: string,
  filename: string,
  onStart?: () => void,
  onFinish?: () => void
): Promise<void> {
  try {
    onStart?.();
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Download failed with status ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  } catch (err) {
    console.error("[Download] Fetch blob failed, falling back to direct link:", err);
    // Direct link fallback
    const fallbackLink = document.createElement("a");
    fallbackLink.href = url;
    fallbackLink.download = filename;
    fallbackLink.click();
  } finally {
    onFinish?.();
  }
}
