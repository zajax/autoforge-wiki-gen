import { parseLuaFile, figureOutValue } from "../utils/utils";
import { CallStatement, CallExpression } from "luaparse";

export interface HusbandryFood {
    food: string;
    [key: string]: any;
}

export interface HusbandryEntry {
    name: string;
    foods: { [key: string]: HusbandryFood };
    [key: string]: any;
}

export function parseHusbandry() {
    const ast = parseLuaFile('data/scripts/husbandry.lua');

    const children = ast.body.filter((x): x is CallStatement => {
        if (x.type !== "CallStatement") return false;
        const expr = x.expression;
        if (expr.type !== "CallExpression") return false;
        if (expr.base.type !== "MemberExpression") return false;
        return expr.base.base.type === "Identifier"
            && expr.base.base.name === "data"
            && expr.base.identifier.name === "set";
    });

    const foods = ast.body.filter((x): x is CallStatement => {
        if (x.type !== "CallStatement") return false;
        const expr = x.expression;
        if (expr.type !== "CallExpression") return false;
        return expr.base.type === "Identifier"
            && expr.base.name === "addNutritions";
    });

    const results: { [key: string]: HusbandryEntry } = {};

    for (const x of children) {
        const expr = x.expression as CallExpression;
        const args = expr.arguments as any[];
        const animalName = figureOutValue(args[0]);
        const animalDetails = Object.fromEntries(
            args[1].fields.map(
                (y: any) => ([y.key.name, figureOutValue(y.value)])
            )
        );
        results[animalName] = { name: animalName, ...animalDetails, foods: {} };
    }

    for (const x of foods) {
        const expr = x.expression as CallExpression;
        const args = expr.arguments as any[];
        const animalName = figureOutValue(args[1]);

        const foodDetails: HusbandryFood[] = args[2].fields.map(
            (y: any) => Object.fromEntries(y.value?.fields?.map((z: any) => ([z.key.name, figureOutValue(z.value)])))
        );
        foodDetails.forEach(food => {
            const animal = results[animalName];
            if(animal)
                animal.foods[food.food] = food;
        });
    }

    return results;
};