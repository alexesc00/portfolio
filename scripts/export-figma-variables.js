/*
 * Exports the Figma file's variables into src/styles/figma-variables.json,
 * the snapshot src/lib/design-tokens.test.ts compares with global.css.
 *
 * It runs inside Figma, through the Plugin API: from a development plugin,
 * or from the Figma MCP server's use_figma tool, which runs a script body,
 * so drop `export` and end with `return await exportFigmaVariables(figma)`.
 * Save what it returns as the snapshot, formatted by Prettier.
 */
export async function exportFigmaVariables(figma) {
  const hexByte = (channel) =>
    Math.round(channel * 255)
      .toString(16)
      .padStart(2, '0');
  const round = (number) => Math.round(number * 10000) / 10000;
  // A variable is known by the CSS it stands for, from its code syntax.
  const cssName = (variable) =>
    /^var\((--[\w-]+)\)$/.exec(variable.codeSyntax.WEB ?? '')?.[1] ?? null;

  const collections = [];
  for (const collection of await figma.variables.getLocalVariableCollectionsAsync()) {
    const variables = [];
    for (const id of collection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(id);
      const values = {};
      for (const mode of collection.modes) {
        const value = variable.valuesByMode[mode.modeId];
        if (value.type === 'VARIABLE_ALIAS') {
          const target = await figma.variables.getVariableByIdAsync(value.id);
          values[mode.name] = { alias: cssName(target) };
        } else if (variable.resolvedType === 'COLOR') {
          const alpha = value.a === undefined ? 'ff' : hexByte(value.a);
          values[mode.name] =
            '#' +
            [value.r, value.g, value.b].map(hexByte).join('') +
            (alpha === 'ff' ? '' : alpha);
        } else if (variable.resolvedType === 'EASING') {
          const { x1, y1, x2, y2 } = value.easingFunctionCubicBezier;
          values[mode.name] = [x1, y1, x2, y2].map(round);
        } else {
          values[mode.name] = round(value);
        }
      }
      variables.push({
        name: variable.name,
        css: cssName(variable),
        type: variable.resolvedType,
        values,
      });
    }
    collections.push({
      name: collection.name,
      modes: collection.modes.map((mode) => mode.name),
      variables,
    });
  }
  return { collections };
}
