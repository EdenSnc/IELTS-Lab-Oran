const extensionAttributeGuard = `
(() => {
  const attribute = 'bis_skin_checked';
  const clean = (root) => {
    if (root?.nodeType === 1 && root.hasAttribute?.(attribute)) root.removeAttribute(attribute);
    root?.querySelectorAll?.('[' + attribute + ']').forEach((node) => node.removeAttribute(attribute));
  };
  clean(document.documentElement);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') clean(record.target);
      for (const node of record.addedNodes) clean(node);
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: [attribute] });
  window.addEventListener('load', () => window.setTimeout(() => { clean(document); observer.disconnect(); }, 3000), { once: true });
})();`;

export default function BrowserExtensionHydrationGuard() {
  return (
    <script
      id="browser-extension-hydration-guard"
      dangerouslySetInnerHTML={{ __html: extensionAttributeGuard }}
    />
  );
}
