import { Eta } from "eta";
import { mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { parseItems } from "./parsers/items";
import { parseLoot } from "./parsers/loot";
// import { parsePrefabs } from "./parsers/prefabs";
import { parseHusbandry } from "./parsers/husbandry";
import { parseFarming } from "./parsers/farming";
import { parseRecipes } from "./parsers/recipes";
import { parseLocalizations } from "./parsers/localization";
import { generateFarmingMarkdown, generateHusbandryMarkdown, generateItemNavbox, generateItemsMarkdown, generateRecipesMarkdown } from "./generators";


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
const items = parseItems();

const loot = parseLoot();
const recipes = parseRecipes();
const farming = parseFarming();
const husbandry = parseHusbandry();
// const prefabs = parsePrefabs();


writeFileSync(
    `${outputBase}/md/items.md`, 
    eta.render("RangerBox.md.eta", { 
        rangerBox: generateItemNavbox(items, localizations)
    }),
    {flag: 'w'}
);

writeFileSync(
    `${outputBase}/md/recipes.md`, 
    generateRecipesMarkdown(recipes, localizations),
    {flag: 'w'}
);

writeFileSync(
    `${outputBase}/md/farming.md`, 
    generateFarmingMarkdown(farming, loot, localizations),
    {flag: 'w'}
);

writeFileSync(
    `${outputBase}/md/husbandry.md`, 
    generateHusbandryMarkdown(husbandry, loot, localizations),
    {flag: 'w'}
);

writeFileSync(
    `${outputBase}/md/items_list.md`, 
    generateItemsMarkdown(items, recipes, farming, husbandry, localizations, loot),
    {flag: 'w'}
);
