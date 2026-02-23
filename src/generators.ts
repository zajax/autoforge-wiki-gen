
import { RangerBox } from "./formatters/RangerBox";
import { FarmingEntry, FarmingStage } from "./parsers/farming";
import { HusbandryEntry } from "./parsers/husbandry";
import { Item } from "./parsers/items";
import { Localization } from "./parsers/localization";
import { LootEntry } from "./parsers/loot";
import { Recipe } from "./parsers/recipes";
import { cleanName, localizedName, localizedDesc } from "./utils/utils";

export const generateItemNavbox = (
    items:{ [key: string]: Item }, 
    localizations:{ [key: string]: Localization }
) => {
    const itemByTypeAndCategory = Object.values(items).reduce((acc: { [type: string]: { [category: string]: Item[] } }, item: Item) => {
        (((acc[item.type] ??= {})[item.category]) ??= []).push(item);
        return acc;
    }, {});
    
    const itemRangerBox: RangerBox = {
        name: "items",
        title: "Items",
        state: "expanded",
        sections: Object.entries(itemByTypeAndCategory).map(([type, categories], index) =>
            ({
                order: (index + 1).toString(),
                title: cleanName(type),
                sections: Object.entries(categories).map(([category, items], subIndex) => ({
                    order: (index + 1).toString()+ "." + (subIndex + 1).toString(),
                    title: cleanName(category),
                    items: items.map(x => localizedName(x.name, localizations))
                }))
            }),
        ),
    };
    return itemRangerBox;
};

export const generateRecipesMarkdown = (
    recipes:{ [key: string]: Recipe },
    localizations:{ [key: string]: Localization }
) => {
    let out = '{| class="wikitable"\n';
    out += '! Recipe !! Inputs !! Outputs !! Duration !! Machines \n';
    Object.entries(recipes).forEach(([_, recipe] : [string, Recipe]) => {
        out += '|-\n';
        out += `| [[${localizedName(recipe.name, localizations)}]] \
|| ${Object.entries(recipe.inputs).map(([itemName, quantity]) => `[[${localizedName(itemName, localizations)}]] x ${quantity}`).join(' <br/> ')} \
|| ${Object.entries(recipe.outputs).map(([itemName, quantity]) => `[[${localizedName(itemName, localizations)}]] x ${quantity}`).join(' <br/> ')} \
|| ${recipe.duration} \
|| ${recipe.machines?.map((machine: string) => `[[${localizedName(machine, localizations)}]]`).join(' <br/> ')} \
\n`;
    });
    return out;
};

export const generateFarmingMarkdown = (
    farming:{  [key: string]: FarmingEntry }, 
    loot:{ [key: string]: LootEntry },
    localizations:{ [key: string]: Localization }
) => {
    for(const plant in farming){
        for(const tool in farming[plant]){
            const farmingStage = farming[plant]?.[tool] as FarmingStage;
            if(!farmingStage) continue;

            const lootKey = farmingStage.loot;
            if(typeof lootKey !== 'string') continue;

            const lootTable = loot[lootKey];
            if(!lootTable?.items) continue;

            for(const item of lootTable.items){
                item['perMinute'] = parseFloat((item.minQuantity / (farmingStage.totalTime / 60000.0)).toFixed(3));
            }
            farmingStage['lootTable'] = lootTable;
        }
    }
    let out = '{| class="wikitable"\n';
    out += '! Plant !! Tool !! Output \n';
    for(const plant in farming){
        for(const tool in farming[plant]){
            if(tool === 'Manual') continue;

            const farmingStage = farming[plant]?.[tool] as FarmingStage;
            if(!farmingStage) continue;

            const lootKey = farmingStage.loot;
            if(typeof lootKey !== 'string') continue;

            const lootTable = loot[lootKey];
            if(!lootTable?.items) continue;
            out += `|-\n`;
            out += `| ${localizedName(plant, localizations)} \
|| [[${tool.split("+").map(part => localizedName(part, localizations)).join(']] + [[')}]] \
|| ${lootTable.items.map((item:any) => ` [[${localizedName(item.name, localizations)}]] x ${item.perMinute}`).join(' <br/> ')} \
\n`;
        }
    }
    return out;
};

export const generateHusbandryMarkdown = (
    husbandry:{ [key: string]: HusbandryEntry }, 
    loot:{ [key: string]: LootEntry },
    localizations:{ [key: string]: Localization }
) => {
    let out = '{| class="wikitable"\n';
    out += '! Egg !! Incubation !! Lifetime !! Food !! Output !! Frequency !! Fatal \n';
    out += '|-\n';
    for(const eggName in husbandry){
        const egg = husbandry[eggName];
        out += Object.entries(egg?.foods ?? {}).map(([_foodName, food]: [string, any]) => `\
| [[${localizedName(eggName, localizations)}]] \
|| ${egg?.incubation} \
|| ${egg?.lifetime} \
|| [[${localizedName(food.food, localizations)}]] \
|| ${loot[food.loot]?.items.map((item:any) => `[[${localizedName(item.name, localizations)}]] x ${item.minQuantity}`).join(' <br/> ')} \
|| ${food.frequency} \
|| ${food.fatal} \
\
`).join('\n|-\n');

    out += '\n|-\n';
    }
    return out;
};

export const generateItemsMarkdown = (
    items:{ [key: string]: Item }, 
    recipes:{ [key: string]: Recipe }, 
    farming:{ [key: string]: FarmingEntry }, 
    husbandry:{ [key: string]: HusbandryEntry }, 
    localizations:{ [key: string]: Localization }, 
    loot:{ [key: string]: LootEntry }
) => {
    let out = '{| class="wikitable"\n';
    out += '! Name !! Internal !! Category !! Description !! Used In !! Output From\n';

    for(const itemName in items){
        const item = items[itemName];
        const usedIn =
            [Object.values(recipes)
                .filter(x => Object.hasOwn(x.inputs, itemName))
                .map(x=>`Recipe [[${localizedName(x.name, localizations)}]]`).join(' <br/> '),
            Object.keys(farming)
                .filter(plantName => plantName===itemName)
                .map(_=>`Plant [[${localizedName(itemName, localizations)}]]`)
                .join(' <br/> '),
            Object.values(husbandry)
                .filter(x => Object.hasOwn(x.foods, itemName))
                .map(x=>`Egg [[${localizedName(x.name, localizations)}]] Food [[${localizedName(itemName, localizations)}]]`)
                .join(' <br/> ')
            ]
            .flat()
            .filter(x=>x)
            .join(' <br/> ')
        ;
        const outputFrom =
            [Object.values(recipes)
                .filter(x => Object.hasOwn(x.outputs, itemName))
                .map(x=>`Recipe [[${localizedName(x.name, localizations)}]]`)
                .join(' <br/> '),
            Object.values(farming)
                .filter(plant => Object.values(plant).some((tool: FarmingStage) => loot[tool?.loot]?.items.some((x:any)=>x.name===itemName)))
                .map(plant=>
                    Object.values(plant).filter((tool: FarmingStage) => loot[tool.loot]?.items.some((x:any)=>x.name===itemName)).map((tool: FarmingStage) => `Plant [[${localizedName(tool.plantName, localizations)}]] Tool [[${localizedName(tool.type, localizations)}]]`)
                )
                .flat()
                .filter(x=> x)
                .join(' <br/> '),
            Object.values(husbandry)
                .filter(x => loot[x.foods[itemName]?.loot]?.items.some((x:any)=>x.name===itemName))
                .map(x=>
                    Object.values(x.foods).filter((food:any) => loot[food?.loot]?.items.some((x:any)=>x.name===itemName)).map((food:any) => `Egg [[${localizedName(x.name, localizations)}]] Food [[${localizedName(food.name, localizations)}]]`)
                )
                .flat()
                .filter(x=> x)
                .join(' <br/> ')
                ]
            .flat()
            .filter(x=>x)
            .join(' <br/> ')
        ;
        out += `|-\n`;
        out += `\
| [[${localizedName(itemName, localizations)}]] \
|| [[${itemName}]] \
|| [[${item?.category}]] \
|| ${localizedDesc(itemName, localizations)} \
|| ${usedIn} \
|| ${outputFrom} \
\n`;
    }
    return out;
};