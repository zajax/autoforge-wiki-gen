import { parseLuaFile, figureOutValue, cleanName, toSnakeCase } from "../utils/utils";
import { CallStatement, CallExpression, TableConstructorExpression } from "luaparse";

export interface Item {
    name: string;
    category: string;
    type: string;
    shortName: string;
};

export function parseItems() {
    const ast = parseLuaFile('data/scripts/items.lua');
    const children = ast.body.filter((x): x is CallStatement => {
        if (x.type !== "CallStatement") return false;
        const expr = x.expression;
        if (expr.type !== "CallExpression") return false;
        if (expr.base.type !== "MemberExpression") return false;
        return expr.base.base.type === "Identifier"
            && expr.base.base.name === "items"
            && expr.base.identifier.name === "set";
    });

    const results: { [key: string]: Item } = {};

    children.forEach(x => {
        const expr = x.expression as CallExpression;
        const itemName = figureOutValue(expr.arguments[0]);
        if(itemName.startsWith('undefined')) return;
        const tableArg = expr.arguments[1] as TableConstructorExpression | undefined;
        results[itemName] = {
            name: itemName,
            category: cleanName(toSnakeCase(figureOutValue(tableArg?.fields?.[0]?.value))),
            type: itemName.split('.')?.[0],
            shortName: cleanName(itemName.split('.')?.[1])
        };
    });

    return results;
};

