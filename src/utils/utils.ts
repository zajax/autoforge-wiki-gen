import parser from "luaparse";
import fs from "fs";
import path from "path";
import { Localization } from "../parsers/localization";
import { Recipe } from "../parsers/recipes";
import { FarmingEntry } from "../parsers/farming";
import { HusbandryEntry } from "../parsers/husbandry";
import { Prefab } from "../parsers/prefabs";


const basePath = 'F:/Games/steamapps/common/AutoForge';

let localizationsCache:{ [key: string]: Localization } = {};
export function setLocalizations(localizations: { [key: string]: Localization }) {
    localizationsCache = localizations;
}

export function parseLuaFile(filePath: string, relativeToAutoForgeRoot = true):parser.Chunk {
    const lua_file_contents = fs.readFileSync(relativeToAutoForgeRoot ? path.join(basePath, filePath) : filePath);
    return parser.parse(lua_file_contents.toString());
}

export function toSnakeCase(str: string):string {
    return str[0]?.toLowerCase() + str.slice(1, str.length).replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/[- ]/g, '');
}

export function cleanName(str: string):string {
    return str.split('_').map(x => /^i+$/i.test(x) ? x.toUpperCase() : x[0]?.toUpperCase() + x.slice(1)).join(' ');
}

export function localizedName(internalName: string):string {
    switch(internalName){
        case 'Manual':
        case 'structure.player':
            return 'Otto';
        case 'structure.dream_telescope':
            return 'Dream Telescope';
        case 'structure.refiner':
            return 'Matter Refiner';
        case 'structure.compressor':
            return 'Matter Compressor';
        default:
            return localizationsCache[internalName]?.name ?? internalName;
    }
}

export function localizedDesc(internalName: string):string {
    return localizationsCache[internalName]?.desc ?? "";
}

export function figureOutValue(val: any):any {
    if(val === null || val === undefined) return null;
    if(val.type === 'MemberExpression'){
        if(val.base.name === 'FluidType') return `material.${toSnakeCase(val.identifier.name)}`;
        if(val.base.name === 'CraftSite') return `structure.${toSnakeCase(val.identifier.name)}`;
        if(val.base.name === 'PlantHarvestTypes') {
            if(val.identifier.name === 'Manual') return 'Manual';
            if(val.identifier.name === 'Automatic') return 'Automatic';
            if(val.identifier.name === 'Planter') return 'structure.planter_box';
            return `material.${toSnakeCase(val.identifier.name)}`;
        }
        if(val.base.name === 'LootOrigin') return val.identifier.name;
        if(val.base.name === 'ItemCategory') return val.identifier.name;
        if(val.base.name === 'fmod') return val.identifier.name;
        if(val.base.name === 'PlacementFeatures') return val.base.name+"."+val.identifier.name;
        if(val.base.name === 'FuelTypes') return val.base.name+"."+val.identifier.name;
        if(val.base.name === 'MatterType') return val.base.name+"."+val.identifier.name;
        if(val.base.name === 'TransportTileType') return val.identifier.name;
        console.error('unknown memberexpression');
        console.trace();
        console.dir(val, {depth:null});
        return val.identifier.name as string;
    }
    if(val.type === 'StringLiteral') return val.raw.slice(1,-1) as string;
    if(val.type === 'NumericLiteral') return val.value as number;
    if(val.type === 'BooleanLiteral') return val.value as boolean;
    if(val.type === 'UnaryExpression' && val.operator === '-') return val.argument.value * -1 as number;

    if(val.type === 'CallExpression' && val.base?.name === 'seconds') return figureOutValue(val.arguments[0]);
    if(val.type === 'CallExpression' && val.base?.name === 'getFluidUse') return figureOutValue(val.arguments[2]);
    if(val.type === 'CallExpression' && val.base?.base?.name === 'Prefab' && val.base?.identifier?.name === 'getID') return figureOutValue(val.arguments[0]);
    if(val.type === 'CallExpression' && val.base?.identifier?.name === 'bor') return val.arguments.map((x: any) => figureOutValue(x));

    console.error("unknown val");
    console.trace();
    console.dir(val, {depth:null});
    return null;
}

export function dirWalk(dir: string, relativeToAutoForgeRoot = true) {
    return fs.readdirSync(relativeToAutoForgeRoot ? path.join(basePath, dir) : dir, {
        withFileTypes: true,
        recursive: true
    });
}

/** Format power value: 1 power unit = 60 S. 1000 S = 1 MS. */
export function formatPower(raw: number | undefined): string | undefined {
    if (raw == null || raw === 0) return undefined;
    const sPerMin = raw * 60;
    if (sPerMin >= 1000) return `${(sPerMin / 1000).toFixed(2)} MS/min`;
    return `${sPerMin.toFixed(2)} S/min`;
}

/** Wrap an item name in a wiki {{icon}} template. */
export function icon(name: string, label: string | undefined = undefined, link: string | undefined = undefined): string {
    if(name === 'Manual') return '{{icon|Otto||Player}}';
    if(label && link) return `{{icon|${name}|${label}|${link}}}`;
    if(label) return `{{icon|${name}|${label}}}`;
    if(link) return `{{icon|${name}||${link}}}`;
    return `{{icon|${name}}}`;
}

export function iconSmall(name: string, label: string | undefined = undefined): string {
    if(label) return `{{iconSmall|${name}|${label}}}`;
    return `{{iconSmall|${name}}}`;
}


/** Build recipe wikitext showing inputs → outputs. */
export function formatRecipe(recipe: Recipe): string {
    const inputs = Object.entries(recipe.inputs)
        .map(([name, qty]) => `${icon(localizedName(name), qty)}`)
        .join(' + ');
    const outputs = Object.entries(recipe.outputs)
        .map(([name, qty]) => `${icon(localizedName(name), qty)}`)
        .join(' + ');
    if(recipe.duration) return `{{icon|time|${recipe.duration}|time}} + ${inputs} → ${outputs}`;
    return `${inputs} → ${outputs}`;
}

const recipesByInputCache: { [itemName: string]: Recipe[] } = {};
const recipesByOutputCache: { [itemName: string]: Recipe[] } = {};

export function recipesByOutput(recipes: { [itemName: string]: Recipe }, itemName: string): Recipe[] {
    if(Object.keys(recipesByOutputCache).length === 0){
        for (const recipe of Object.values(recipes)) {
            for (const outputName of Object.keys(recipe.outputs)) {
                (recipesByOutputCache[outputName] ??= []).push(recipe);
            }
        }
    }
    return recipesByOutputCache[itemName] ?? [];
}

export function recipesByInput(recipes: { [itemName: string]: Recipe }, itemName: string): Recipe[] {
    if(Object.keys(recipesByInputCache).length === 0){
        for (const recipe of Object.values(recipes)) {
            for (const inputName of Object.keys(recipe.inputs)) {
                (recipesByInputCache[inputName] ??= []).push(recipe);
            }
        }
    }
    return recipesByInputCache[itemName] ?? [];
}

const farmingUsageCache: { [itemName: string]: FarmingEntry[] } = {};
const husbandryUsageCache: { [itemName: string]: HusbandryEntry[] } = {};

export function farmingUsage(farming: { [plantName: string]: FarmingEntry } , itemName: string)  {
    
        
    if(Object.keys(farmingUsageCache).length === 0){
        Object.values(farming).forEach(entry => {
            Object.values(entry).forEach(stage => {
                if (!stage?.lootTable) return;
                stage.lootTable.items.forEach((item:any) => {
                    if((farmingUsageCache[item.name] ??= []).includes(entry)) return;
                    (farmingUsageCache[item.name] ??= []).push(entry);
                });
            });
        });
    }
    return farmingUsageCache[itemName] ?? [];
}

export function husbandryUsage(husbandry: { [eggName: string]: HusbandryEntry } , itemName: string)  {
    if(Object.keys(husbandryUsageCache).length === 0){
        Object.values(husbandry).forEach(entry => {
            Object.values(entry.foods).forEach(food => {
                if (!food?.lootTable) return;
                food.lootTable.items.forEach((item:any) => {
                    if((husbandryUsageCache[item.name] ??= []).includes(entry)) return;
                    (husbandryUsageCache[item.name] ??= []).push(entry);
                });
            });
        });
    }
    return husbandryUsageCache[itemName] ?? [];
}

export function plantNameToSeedId(plantName: string, prefabs: { [key: string]: Prefab }): string {
    if(plantName === 'Quartz') return 'material.quartz';
    if(plantName === 'Ember Pepper') return 'flora.ember_pepper';
    const idTest = `flora.${toSnakeCase(plantName)}`;
    const prefab = Object.entries(prefabs).find(([id, p]) => p.creates === idTest && id !== idTest)?.[1];
    // if(plantName.toLocaleLowerCase().includes('ember')) {
    //    console.log(plantName, idTest, prefab?.id);
    // }
    if(prefab) return prefab.id;
    return plantName; // Fallback in case no matching prefab is found
}