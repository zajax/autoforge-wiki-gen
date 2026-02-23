import { parseLuaFile, figureOutValue } from "../utils/utils";
import { CallStatement, CallExpression, FunctionDeclaration } from "luaparse";

export interface Recipe {
    name: string;
    inputs: { [key: string]: any };
    outputs: { [key: string]: any };
    duration: any;
    machines: any[];
}

export function parseRecipes() {
    const ast = parseLuaFile('data/scripts/recipes.lua');
    const funcDef = ast.body.find((x): x is FunctionDeclaration =>
        x.type === "FunctionDeclaration"
        && x.identifier?.type === "Identifier"
        && x.identifier.name === "addRecipes"
    );

    if (!funcDef) throw new Error("addRecipes function not found");

    const children = funcDef.body.filter((x): x is CallStatement => {
        if (x.type !== "CallStatement") return false;
        const expr = x.expression;
        if (expr.type !== "CallExpression") return false;
        if (expr.base.type !== "MemberExpression") return false;
        return expr.base.base.type === "Identifier"
            && expr.base.base.name === "CraftManager"
            && expr.base.identifier.name === "add";
    });

    const results: { [key: string]: Recipe } = {};

    children.forEach(x => {
        const expr = x.expression as CallExpression;
        const innerCall = expr.arguments[0] as any;
        const recipeName = figureOutValue(innerCall.arguments[1]);
        results[recipeName] = {
            name: recipeName,
            inputs: Object.fromEntries(
                innerCall.arguments[2].fields.map((f: any) =>
                    f?.value.arguments?.[0].type === 'Identifier'
                    && f?.value.arguments?.[0].name === 'FluidItem' ?
                    [
                        figureOutValue(f?.value.arguments?.[1]),
                        figureOutValue(f?.value.arguments?.[2])
                    ]
                    :
                    [
                        figureOutValue(f?.value.arguments?.[0]),
                        figureOutValue(f?.value.arguments?.[1])
                    ])
            ),
            outputs: Object.fromEntries(
                innerCall.arguments[3].fields.map((f: any) =>
                    f?.value.arguments?.[0].type === 'Identifier'
                    && f?.value.arguments?.[0].name === 'FluidItem' ?
                    [
                        figureOutValue(f?.value.arguments?.[1]),
                        figureOutValue(f?.value.arguments?.[2])
                    ]
                    :
                    [
                        figureOutValue(f?.value.arguments?.[0]),
                        figureOutValue(f?.value.arguments?.[1])
                    ])
            ),
            duration: figureOutValue(innerCall.arguments[4]),
            machines: [
                figureOutValue(innerCall.arguments[5])
            ].flat(),
        };
    });

    return results;
};

