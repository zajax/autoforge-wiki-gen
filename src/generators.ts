
import { InfoboxData } from "./formatters/Infobox";
import { RangerBox } from "./formatters/RangerBox";
import { FarmingEntry, FarmingStage } from "./parsers/farming";
import { HusbandryEntry } from "./parsers/husbandry";
import { Item } from "./parsers/items";
import { LootEntry } from "./parsers/loot";
import { Prefab } from "./parsers/prefabs";
import { Recipe } from "./parsers/recipes";
import { cleanName, localizedName, localizedDesc, formatRecipe, icon, iconSmall, recipesByInput, recipesByOutput, farmingUsage, husbandryUsage, plantNameToSeedId } from "./utils/utils";

export const generateItemNavbox = (
    items:{ [key: string]: Item }
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
                    items: items.map(x => localizedName(x.name))
                }))
            }),
        ),
    };
    return itemRangerBox;
};

export const generateRecipesMarkdown = (
    recipes:{ [key: string]: Recipe }
) => {
    let out = '{| class="wikitable"\n';
    out += '! Recipe !! Inputs !! Outputs !! Duration !! Machines \n';
    Object.entries(recipes).forEach(([_, recipe] : [string, Recipe]) => {
        out += '|-\n';
        out += `| [[${localizedName(recipe.name)}]] \
|| ${Object.entries(recipe.inputs).map(([itemName, quantity]) => `[[${localizedName((itemName))}]] x ${quantity}`).join(' <br/> ')} \
|| ${Object.entries(recipe.outputs).map(([itemName, quantity]) => `[[${localizedName(itemName)}]] x ${quantity}`).join(' <br/> ')} \
|| ${recipe.duration} \
|| ${recipe.machines?.map((machine: string) => `[[${localizedName(machine)}]]`).join(' <br/> ')} \
\n`;
    });
    return out;
};

export const generateFarmingMarkdown = (
    farming:{  [key: string]: FarmingEntry }
) => {

    let out = '{| class="wikitable"\n';
    out += '! Plant !! Tool !! Output \n';
    for(const plant in farming){
        for(const tool in farming[plant]){
            if(tool === 'Manual') continue;

            const farmingStage = farming[plant]?.[tool] as FarmingStage;
            if(!farmingStage) continue;

            const lootTable = farmingStage.lootTable;
            if(!lootTable?.items) continue;
            out += `|-\n`;
            out += `| ${localizedName(plant)} \
|| [[${tool.split("+").map(part => localizedName(part)).join(']] + [[')}]] \
|| ${lootTable.items.map((item:any) => ` [[${localizedName(item.name)}]] x ${item.perMinute}`).join(' <br/> ')} \
\n`;
        }
    }
    return out;
};

export const generateHusbandryMarkdown = (
    husbandry:{ [key: string]: HusbandryEntry }
) => {
    let out = '{| class="wikitable"\n';
    out += '! Egg !! Incubation !! Lifetime !! Food !! Output !! Frequency !! Fatal \n';
    out += '|-\n';
    for(const eggName in husbandry){
        const egg = husbandry[eggName];
        out += Object.entries(egg?.foods ?? {}).map(([_foodName, food]: [string, any]) => `\
| [[${localizedName(eggName)}]] \
|| ${egg?.incubation} \
|| ${egg?.lifetime} \
|| [[${localizedName(food.food)}]] \
|| ${food.lootTable?.items.map((item:any) => `[[${localizedName(item.name)}]] x ${item.minQuantity}`).join(' <br/> ')} \
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
    loot:{ [key: string]: LootEntry }
) => {
    let out = '{| class="wikitable"\n';
    out += '! Name !! Internal !! Category !! Description !! Used In !! Output From\n';

    for(const itemName in items){
        const item = items[itemName];
        const usedIn =
            [Object.values(recipes)
                .filter(x => Object.hasOwn(x.inputs, itemName))
                .map(x=>`Recipe [[${localizedName(x.name)}]]`).join(' <br/> '),
            Object.keys(farming)
                .filter(plantName => plantName===itemName)
                .map(_=>`Plant [[${localizedName(itemName)}]]`)
                .join(' <br/> '),
            Object.values(husbandry)
                .filter(x => Object.hasOwn(x.foods, itemName))
                .map(x=>`Egg [[${localizedName(x.name)}]] Food [[${localizedName(itemName)}]]`)
                .join(' <br/> ')
            ]
            .flat()
            .filter(x=>x)
            .join(' <br/> ')
        ;
        const outputFrom =
            [Object.values(recipes)
                .filter(x => Object.hasOwn(x.outputs, itemName))
                .map(x=>`Recipe [[${localizedName(x.name)}]]`)
                .join(' <br/> '),
            Object.values(farming)
                .filter(plant => Object.values(plant).some((tool: FarmingStage) => loot[tool?.loot]?.items.some((x:any)=>x.name===itemName)))
                .map(plant=>
                    Object.values(plant).filter((tool: FarmingStage) => loot[tool.loot]?.items.some((x:any)=>x.name===itemName)).map((tool: FarmingStage) => `Plant [[${localizedName(tool.plantName)}]] Tool [[${localizedName(tool.type)}]]`)
                )
                .flat()
                .filter(x=> x)
                .join(' <br/> '),
            Object.values(husbandry)
                .filter(x => loot[x.foods[itemName]?.loot]?.items.some((x:any)=>x.name===itemName))
                .map(x=>
                    Object.values(x.foods).filter((food:any) => loot[food?.loot]?.items.some((x:any)=>x.name===itemName)).map((food:any) => `Egg [[${localizedName(x.name)}]] Food [[${localizedName(food.name)}]]`)
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
| [[${localizedName(itemName)}]] \
|| [[${itemName}]] \
|| [[${item?.category}]] \
|| ${localizedDesc(itemName)} \
|| ${usedIn} \
|| ${outputFrom} \
\n`;
    }
    return out;
};

export const generateItembox = (
    item: Item, 
    prefabs: { [key: string]: Prefab },
    farming: { [key: string]: FarmingEntry },
    husbandry: { [key: string]: HusbandryEntry },
    recipes: { [key: string]: Recipe },
) => {
    const itemName = item.name;
    const itemRecipesByOutput = recipesByOutput(recipes, itemName);
    const itemRecipesByInput = recipesByInput(recipes, itemName);
    const locName = localizedName(itemName);
    const prefab = prefabs[itemName];

    // --- Recipes ---
    // Categorise recipes that produce this item by machine type
    const producingRecipes = itemRecipesByOutput;
    const consumingRecipes = itemRecipesByInput;

    // Determine recipe1 (standard), recipe2 (forge), recipe3 (lava forge)
    let recipe1: string | undefined;
    let recipe2: string | undefined;
    let recipe3: string | undefined;

    for (const r of producingRecipes) {
        const machines = (r.machines ?? []) as string[];
        const formatted = formatRecipe(r);
        const isForge = machines.some(m => m.includes('forge') && !m.includes('lava'));
        const isLavaForge = machines.some(m => m.includes('lava'));
        if (isLavaForge) {
            recipe3 = recipe3 ? recipe3 + '<br/>' + formatted : formatted;
        } else if (isForge) {
            recipe2 = recipe2 ? recipe2 + '<br/>' + formatted : formatted;
        } else {
            recipe1 = recipe1 ? recipe1 + '<br/>' + formatted : formatted;
        }
    }
    // --- Produced by (machines that output this item) ---
    const prodbyParts: string[] = [];
    for (const r of producingRecipes) {
        for (const m of (r.machines ?? [])) {
            prodbyParts.push(icon(localizedName(m)));
        }
    }
    const husbandryProducers = husbandryUsage(husbandry, itemName);
    const farmingProducers = farmingUsage(farming, itemName);
    husbandryProducers.forEach(x => { 
        const foodName = Object.keys(x.foods).find(foodName => x.foods[foodName]?.lootTable && x.foods[foodName]?.lootTable.items.some((i:any) => i.name === itemName));
        if(foodName){
            prodbyParts.push(`${icon(localizedName(x.name))} + ${icon(localizedName(foodName))}`);
        }
    });
    farmingProducers.forEach(x => {
        const stages = Object.values(x).filter((stage: any) => stage?.lootTable?.items.some((i:any) => i.name === itemName)) as FarmingStage[];
        stages.forEach(stage => {
            if(stage && stage.type !== 'Manual' && stage.type !== 'structure.planter_box'){
                if(stage.fluid !== 'material.none'){
                    prodbyParts.push(`${icon(localizedName(plantNameToSeedId(stage.plantName, prefabs)), `${iconSmall(localizedName(stage.type) + " " + localizedName(stage.fluid))}`)}`);
                }else{
                    prodbyParts.push(`${icon(localizedName(plantNameToSeedId(stage.plantName, prefabs)), `${iconSmall(localizedName(stage.type))}`)}`);
                }
            }
        });
    });
    const prodby = Array.from(new Set(prodbyParts)).join(' ') || undefined;


    // --- Required for (recipes that use this item as input, excluding Refiner recipes) ---
    const reqforParts: string[] = [];
    for (const r of consumingRecipes) {
        const machines = (r.machines ?? []) as string[];
        const isRefinerOnly = machines.length > 0 && machines.every(m => m === 'structure.refiner');
        if (!isRefinerOnly) {
            for (const outputName of Object.keys(r.outputs)) {
                if (outputName !== itemName) {
                    reqforParts.push(icon(localizedName(outputName)));
                }
            }
        }
    }
    const creates = prefabs[itemName]?.creates;
    let reqForFarming: string[] = [];
    const farmingTools: string[] = [];
    const farmingConsumers: FarmingEntry[] = [];
    if(creates){
        const prefabCreated = prefabs[creates];
        const plantName = prefabCreated?.plantName;
        const plant = farming[plantName];
        if(plant){
            Object.values(plant).forEach((stage: FarmingStage) => {
                if(stage.type !== 'Manual'){
                    if(stage.fluid !== 'material.none'){
                        farmingTools.push(`${icon(localizedName(plantNameToSeedId(stage.plantName, prefabs)))} + ${icon(localizedName(stage.type) + " " + localizedName(stage.fluid))}`);
                    }else{
                        farmingTools.push(`${icon(localizedName(plantNameToSeedId(stage.plantName, prefabs)))} + ${icon(localizedName(stage.type))}`);
                    }
                    if(!farmingConsumers.includes(plant)){
                        farmingConsumers.push(plant);
                    }
                }
                reqForFarming = reqForFarming.concat((stage?.lootTable?.items ?? []).map((x:any) => icon(localizedName(x.name))));
            });
        }
    }
    const husbandryConsumers: HusbandryEntry[] = Object.values(husbandry).filter(x => Object.values(x.foods).some((food:any) => food.food === itemName));
    
    const husbandryEgg: HusbandryEntry | undefined = husbandry[itemName] ? husbandry[itemName] : undefined;
    if(husbandryEgg){
        husbandryConsumers.unshift(husbandryEgg);
    }

    const reqfor = Array.from(new Set(reqforParts.concat(reqForFarming))).join(' ') || undefined;



    const refto = prefab?.matter ? icon(localizedName(prefab.matter.type), prefab.matter.amount) : undefined;

    // --- Extracted by (farming tools) ---
    const ext = farmingTools.join(' ') || undefined;

    const categories = [item?.category?.charAt(0)?.toUpperCase() + item?.category?.slice(1), item?.type?.charAt(0)?.toUpperCase() + item?.type?.slice(1)].filter(x=>x);

    if(farmingTools.length > 0){
        categories.push('Farmable Items');
    }
    if(husbandryConsumers.length > 0){
        categories.push('Food');
    }
    if(producingRecipes.length > 0){
        categories.push('Craftable Items');
    }
    if(prefab?.bio){
        categories.push('Biofuel');
        categories.push('Fuel');
    }
    if(prefab?.mana){
        categories.push('Manafuel');
        categories.push('Fuel');
    }


    // --- Build InfoboxData ---
    const infobox: InfoboxData = {
        title: locName,
        description: localizedDesc(itemName) || undefined,
        images: `${locName}.png:Inventory`,
        recipe1,
        recipe2,
        recipe3,
        stack: prefab?.stack ?? undefined,
        HP: prefab?.hp ?? undefined,
        ATK: prefab?.atk ?? undefined,
        DEF: prefab?.def ?? undefined,
        idle: prefab?.power?.idle,
        active: prefab?.power?.active,
        prodby,
        reqfor,
        refto,
        ext,
        bio: prefab?.bio ?? undefined,
        mana: prefab?.mana ?? undefined,
        producingRecipes: producingRecipes,
        consumingRecipes: consumingRecipes,
        farmingProducers: farmingProducers,
        husbandryProducers: husbandryProducers,
        farmingConsumers: farmingConsumers,
        husbandryConsumers: husbandryConsumers,
        categories,
        transpd: prefab?.transport !== undefined ? parseInt(`${prefab?.transport?.speed}`) : undefined,
    };
    return infobox;
}