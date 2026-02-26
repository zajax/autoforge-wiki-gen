import { parseLuaFile, figureOutValue } from "../utils/utils";
import { CallStatement, CallExpression } from "luaparse";
import { LootEntry } from "./loot";

export interface FarmingStage {
    plantName: string;
    totalTime: number;
    loot: any;
    lootTable?: LootEntry;
    type: string;
    fluid: string;
    [key: string]: any;
}

export interface FarmingEntry {
    [stageKey: string]: FarmingStage  | undefined;
}

export function parseFarming(loot: { [lootName: string]: LootEntry }) {
    const ast = parseLuaFile('data/scripts/farming.lua');

    const children = ast.body.filter((x): x is CallStatement => {
        if (x.type !== "CallStatement") return false;
        const expr = x.expression;
        if (expr.type !== "CallExpression") return false;
        if (expr.base.type !== "MemberExpression") return false;
        return expr.base.base.type === "Identifier"
            && expr.base.base.name === "data"
            && expr.base.identifier.name === "set";
    });

    const results: { [key: string]: FarmingEntry } = {};

    for (const x of children) {
        const expr = x.expression as CallExpression;
        const args = expr.arguments as any[];
        const plantName = figureOutValue(args[0]);
        const plantStages: FarmingStage[] = args[1].fields
            ?.map((f: any) => f?.value?.arguments[3]?.fields)
            ?.filter((f: any) => !!f)
            ?.map((z: any) => z.map((f: any) => ({
                plantName: plantName,
                ...Object.fromEntries(f?.value?.fields.map((y: any) => [y.key.name, figureOutValue(y.value)]))
            })))[0];
            plantStages.forEach(stage => {
                if(stage.loot){
                    const lootEntry = loot[stage.loot];
                    if(lootEntry) stage.lootTable = lootEntry;
                }
            });
        results[plantName] = {
            ...Object.fromEntries(plantStages.map(s => [s.type + (s.fluid !== 'material.none' ? '+' + s.fluid : ''), s]))
        };
    }
    return results;
};


