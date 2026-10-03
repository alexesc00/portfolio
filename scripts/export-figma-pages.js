/*
 * Exports what the Figma file's current pages promise about the site into
 * src/styles/figma-pages.json, the snapshot src/lib/figma-pages.test.ts
 * compares with the code. Current pages are the ones that match the live
 * site: Foundations, Components and Site.
 *
 * It returns every component on those pages with its properties, and the
 * wording drawn on Site: text inside component instances, which leaves out
 * the boards' own headings and notes.
 *
 * Re-export after any change to a current page. It runs inside Figma,
 * through the Plugin API: from a development plugin, or from the Figma MCP
 * server's use_figma tool, which runs a script body, so drop `export` and
 * end with `return await exportFigmaPages(figma)`. Save what it returns as
 * the snapshot, formatted by Prettier.
 */
export async function exportFigmaPages(figma) {
  const currentPages = ['Foundations', 'Components', 'Site'];
  const describe = (definition) =>
    definition.type === 'VARIANT'
      ? `VARIANT: ${definition.variantOptions.join(' | ')}`
      : definition.type;
  const isShown = (node) => {
    for (let at = node; at && at.type !== 'PAGE'; at = at.parent) {
      if (!at.visible) return false;
    }
    return true;
  };
  const isInsideInstance = (node) => {
    for (let at = node.parent; at && at.type !== 'PAGE'; at = at.parent) {
      if (at.type === 'INSTANCE') return true;
    }
    return false;
  };

  const components = [];
  const siteText = new Set();
  for (const page of figma.root.children) {
    if (!currentPages.includes(page.name)) continue;
    // A page that isn't open is searched without the insides of its
    // instances, and Site's wording is all inside instances.
    if (page.name === 'Site') await figma.setCurrentPageAsync(page);
    else await page.loadAsync();
    const found = page.findAllWithCriteria({
      types: ['COMPONENT', 'COMPONENT_SET'],
    });
    for (const component of found) {
      // A variant is part of its set, which carries the properties.
      if (component.parent.type === 'COMPONENT_SET') continue;
      const properties = {};
      for (const [key, definition] of Object.entries(
        component.componentPropertyDefinitions,
      )) {
        properties[key.split('#')[0]] = describe(definition);
      }
      components.push({ name: component.name, page: page.name, properties });
    }
    if (page.name !== 'Site') continue;
    for (const text of page.findAllWithCriteria({ types: ['TEXT'] })) {
      if (!isShown(text) || !isInsideInstance(text)) continue;
      const wording = text.characters.replace(/\s+/g, ' ').trim();
      if (wording) siteText.add(wording);
    }
  }
  return {
    // Today in the local time zone, as YYYY-MM-DD.
    exported: new Date().toLocaleDateString('en-CA'),
    components,
    siteText: [...siteText].sort(),
  };
}
