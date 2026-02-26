import { Eta } from "eta";
import { mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { parseItems } from "./parsers/items";
import { parseLoot } from "./parsers/loot";
import { parsePrefabs } from "./parsers/prefabs";
import { parseHusbandry } from "./parsers/husbandry";
import { parseFarming } from "./parsers/farming";
import { parseRecipes } from "./parsers/recipes";
import { parseLocalizations } from "./parsers/localization";
import { generateFarmingMarkdown, generateHusbandryMarkdown, generateItemNavbox, generateItembox, generateItemsMarkdown, generateRecipesMarkdown } from "./generators";
import { InfoboxData } from "./formatters/Infobox";
import { localizedName, plantNameToSeedId, setLocalizations } from "./utils/utils";


const outputBase = resolve(join(__dirname, '..', 'out'));

const eta = new Eta({
    views: join(__dirname, 'templates'),
    autoEscape: false,
    autoTrim: false,
    defaultExtension: "eta",
});

mkdirSync(outputBase, {recursive: true});
mkdirSync(outputBase+"/md", {recursive: true});


const localizations = parseLocalizations();
setLocalizations(localizations);
const items = parseItems();

const loot = parseLoot();
const recipes = parseRecipes();
const farming = parseFarming(loot);
const husbandry = parseHusbandry(loot);
const prefabs = parsePrefabs();


// fix fluids
recipes['Lava'] = {
    name: 'Lava',
    inputs: {},
    duration: 0,
    outputs: { 'material.lava': 1000 },
    machines: ["structure.pump"]
};
recipes['Water'] = {
    name: 'Water',
    inputs: {},
    duration: 0,
    outputs: { 'material.water': 1000 },
    machines: ["structure.pump"]
};
recipes['Miasma'] = {
    name: 'Miasma',
    inputs: {},
    duration: 0,
    outputs: { 'material.miasma': 1000 },
    machines: ["structure.pump"]
};

writeFileSync(
    `${outputBase}/md/items.md`, 
    eta.render("RangerBox.md.eta", { 
        rangerBox: generateItemNavbox(items)
    }),
    {flag: 'w'}
);
console.log(`Generated items rangerbox with ${Object.keys(items).length} items.`);

writeFileSync(
    `${outputBase}/md/recipes.md`, 
    generateRecipesMarkdown(recipes),
    {flag: 'w'}
);
console.log(`Generated recipes page with ${Object.keys(recipes).length} recipes.`);

writeFileSync(
    `${outputBase}/md/farming.md`, 
    generateFarmingMarkdown(farming),
    {flag: 'w'}
);
console.log(`Generated farming page with ${Object.keys(farming).length} plants.`);

writeFileSync(
    `${outputBase}/md/husbandry.md`, 
    generateHusbandryMarkdown(husbandry),
    {flag: 'w'}
);
console.log(`Generated husbandry page with ${Object.keys(husbandry).length} eggs.`);

writeFileSync(
    `${outputBase}/md/items_list.md`, 
    generateItemsMarkdown(items, recipes, farming, husbandry, loot),
    {flag: 'w'}
);
console.log(`Generated main items page with ${Object.keys(items).length} items.`);

// --- Generate individual Infobox pages per item ---

const itemsDir = `${outputBase}/items`;
mkdirSync(itemsDir, { recursive: true });


for (const item of Object.values(items)) {
    const infobox = generateItembox(item, prefabs, farming, husbandry, recipes);

    // Strip undefined keys so the template checks work cleanly
    for (const key of Object.keys(infobox) as (keyof InfoboxData)[]) {
        if (infobox[key] == null) delete infobox[key];
    }
    const rendered = eta.render("Infobox.md.eta", { item: infobox, localizedName: localizedName, plantNameToSeedId: (name:string) => plantNameToSeedId(name, prefabs) });

    const safeFileName = localizedName(item.name).replace(/[<>:"/\\|?*]/g, '_');
    if(item.name === "flora.nooknook_spore") continue; // skip this one since it has a localized name with a slash that breaks the filename
    writeFileSync(
        `${itemsDir}/${safeFileName}.md`,
        rendered,
        { flag: 'w' }
    );
}

console.log(`Generated ${Object.keys(items).length} item infobox pages in ${itemsDir}`);
