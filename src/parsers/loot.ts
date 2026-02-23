import { parseLuaFile, figureOutValue } from "../utils/utils";
import { CallStatement, CallExpression, FunctionDeclaration } from "luaparse";

export interface LootDrop {
    name: any;
    minQuantity: any;
    maxQuantity: any;
    isBonus: any;
    emptyChance: any;
    type: string;
    groupName?: string;
    perMinute?: number;
}

export interface LootEntry {
    name: string;
    origin: any;
    items: LootDrop[];
}

function filterLootCalls(body: import("luaparse").Statement[], methodName: string): CallStatement[] {
    return body.filter((x): x is CallStatement => {
        if (x.type !== "CallStatement") return false;
        const expr = x.expression;
        if (expr.type !== "CallExpression") return false;
        if (expr.base.type !== "MemberExpression") return false;
        return expr.base.base.type === "Identifier"
            && expr.base.base.name === "LootSystem"
            && expr.base.identifier.name === methodName;
    });
}

export function parseLoot() {
    const ast = parseLuaFile('data/scripts/loot.lua');

    const funcdef = ast.body.find((x): x is FunctionDeclaration =>
        x.type === "FunctionDeclaration"
        && x.identifier?.type === "Identifier"
        && x.identifier.name === "addLoot"
    );

    if (!funcdef) throw new Error("addLoot function not found");

    const children = filterLootCalls(funcdef.body, "addBatch");

    const lootgroupsChildren = filterLootCalls(funcdef.body, "addGroup");

    const lootgroups: { [key: string]: LootDrop[] } = {};
    lootgroupsChildren.forEach(x => {
        const expr = x.expression as CallExpression;
        const args = expr.arguments as any[];
        const groupName = figureOutValue(args[0]);
        lootgroups[groupName] = args[1].arguments[0].fields.map((y: any) => ({
            name: figureOutValue(y.value.fields[0].value.arguments[1]),
            minQuantity: figureOutValue(y.value.fields[0].value.arguments[2].fields[0].value.fields[0].value),
            maxQuantity: figureOutValue(y.value.fields[0].value.arguments[2].fields.at(-1).value.fields[0].value),
            isBonus: false,
            emptyChance: 0,
            type: 'group',
            groupName,
        }));
    });


    const results: { [key: string]: LootEntry } = {};

    children.forEach(x => {
        const expr = x.expression as CallExpression;
        const args = expr.arguments as any[];
        const lootName = figureOutValue(args[0]);
        const lootOrigin = figureOutValue(args[1]);
        const fields = args[2]?.fields;

        const lootItemResults: LootDrop[] = fields
            ?.filter((f: any) => f?.value?.base?.identifier?.name === 'item')
            ?.map((f: any) => ({
                name: figureOutValue(f?.value?.arguments[0]),
                minQuantity: figureOutValue(f?.value?.arguments[1]),
                maxQuantity: figureOutValue(f?.value?.arguments[1]),
                isBonus: figureOutValue(f?.value?.arguments[2]),
                emptyChance: figureOutValue(f?.value?.arguments[3]),
                type: 'item'
            })) ?? [];

        const lootGroupResults: LootDrop[] = fields
            ?.filter((f: any) => f?.value?.base?.identifier?.name === 'group')
            ?.map((f: any) => lootgroups[figureOutValue(f?.value?.arguments[1])])
            ?.flat() ?? [];

        const lootEntryResults: LootDrop[] = fields
            ?.filter((f: any) => f?.value?.base?.identifier?.name === 'entry')
            ?.map((f: any) => ({
                name: figureOutValue(f?.value?.arguments[0]?.arguments[1]),
                minQuantity: figureOutValue(f?.value?.arguments[0]?.arguments[2]?.fields[0]?.value?.fields[0]?.value),
                maxQuantity: figureOutValue(f?.value?.arguments[0]?.arguments[2]?.fields.at(-1)?.value?.fields[0]?.value),
                isBonus: figureOutValue(f?.value?.arguments[0]?.arguments[3]?.fields?.[0]?.value?.fields[0]?.value),
                emptyChance: figureOutValue(f?.value?.arguments[1]),
                type: 'entry',
            })) ?? [];

        const lootFluidResults: LootDrop[] = fields
            ?.filter((f: any) => f?.value?.base?.identifier?.name === 'fluid')
            ?.map((f: any) => ({
                name: figureOutValue(f?.value?.arguments[0]),
                minQuantity: figureOutValue(f?.value?.arguments[1]),
                maxQuantity: figureOutValue(f?.value?.arguments[1]),
                isBonus: false,
                emptyChance: figureOutValue(f?.value?.arguments[2]),
                type: 'fluid',
            })) ?? [];

        results[lootName] = {name: lootName, origin: lootOrigin, items: [...lootItemResults, ...lootEntryResults, ...lootFluidResults, ...lootGroupResults]};
    });

    //console.dir(results, {depth:null});

    return results;
};

