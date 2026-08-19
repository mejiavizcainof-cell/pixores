import assert from "node:assert/strict";
import {
  createLowerThirdConfig,
  getLowerThirdRenderModel,
  lowerThirdTemplates,
  normalizeLowerThirdColor,
  setLowerThirdColor,
} from "../src/video-render/lower-thirds.ts";

assert.equal(normalizeLowerThirdColor("#abc"), "#AABBCC");
assert.equal(normalizeLowerThirdColor("not-a-color", "#123456"), "#123456");

for (const template of lowerThirdTemplates) {
  const original = createLowerThirdConfig(template.id);
  const usedColorKeys = new Set(original.components.map((component) => component.color));
  for (const key of usedColorKeys) {
    const replacement = original.colors[key].toUpperCase() === "#12AB34" ? "#FE218B" : "#12AB34";
    const changed = setLowerThirdColor(original, key, replacement);
    const model = getLowerThirdRenderModel(changed, 1, 5);
    const affected = model.filter((primitive) => primitive.color === key);
    assert.ok(affected.length > 0, `${template.id} should use ${key}`);
    assert.ok(affected.every((primitive) => primitive.resolvedColor === replacement), `${template.id} did not update ${key}`);
    assert.equal(original.colors[key], template.defaults.colors[key], `${template.id} mutated its template defaults`);
  }
}

console.log(`Lower-third color controls passed for ${lowerThirdTemplates.length} templates.`);
