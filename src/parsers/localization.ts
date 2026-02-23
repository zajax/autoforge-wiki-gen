import { parseLuaFile, figureOutValue } from "../utils/utils";
import { CallStatement, CallExpression } from "luaparse";

export interface Localization {
    internal: string;
    name: string | null;
    desc: string | null;
}

export function parseLocalizations():{ [key: string]: Localization } {
    const ast = parseLuaFile('data/scripts/localizations/en.lua');

    const funcdef = ast.body.filter((x): x is CallStatement => {
        if (x.type !== "CallStatement") return false;
        const expr = x.expression;
        if (expr.type !== "CallExpression") return false;
        if (expr.base.type !== "MemberExpression") return false;
        if (expr.base.base.type !== "Identifier" || expr.base.base.name !== "locale") return false;
        if (expr.base.identifier.name !== "add") return false;
        const val = figureOutValue(expr.arguments[2]);
        return val === 'ItemName' || val === 'ItemDesc';
    });

    const results: { [key: string]: Localization } = {};

    funcdef.forEach(x => {
        const expr = x.expression as CallExpression;
        const internalName = figureOutValue(expr.arguments[0]).slice(0,-4); // remove last 4 chars
        const obj = results[internalName] ?? {internal: internalName, name: null, desc: null};
        obj[expr.arguments[2]?.type === 'StringLiteral' && expr.arguments[2].raw === '"ItemName"' ? 'name' : 'desc'] = figureOutValue(expr.arguments[1]);
        results[internalName] = obj;
    });

    return results;
};