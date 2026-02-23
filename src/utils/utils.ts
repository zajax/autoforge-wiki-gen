import parser from "luaparse";
import fs from "fs";
import path from "path";
import { Localization } from "../parsers/localization";


const basePath = 'F:/Games/steamapps/common/AutoForge';

export function parseLuaFile(filePath: string, relativeToAutoForgeRoot = true):parser.Chunk {
    const lua_file_contents = fs.readFileSync(relativeToAutoForgeRoot ? path.join(basePath, filePath) : filePath);
    return parser.parse(lua_file_contents.toString());
}

export function toSnakeCase(str: string):string {
    return str[0]?.toLowerCase() + str.slice(1, str.length).replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export function cleanName(str: string):string {
    return str.split('_').map(x => /^i+$/i.test(x) ? x.toUpperCase() : x[0]?.toUpperCase() + x.slice(1)).join(' ');
}

export function localizedName(internalName: string, localizations: { [key: string]: Localization }):string {
    return localizations[internalName]?.name ?? internalName;
}

export function localizedDesc(internalName: string, localizations: { [key: string]: Localization }):string {
    return localizations[internalName]?.desc ?? "";
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