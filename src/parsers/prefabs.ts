import { parseLuaFile, figureOutValue, dirWalk } from "../utils/utils";
import path from "path";
import { CallStatement, CallExpression, Statement } from "luaparse";

export interface Prefab {
    id: string;
    creates?: string;
    icon: any;
    stack: any;
    drillSpeed: any;
    plantName: any;
    power: { idle: any; active: any };
    bio?: any;
    mana?: any;
    collector: any;
    atk: any;
    def: any;
    hp: any;
    matter?: {type: string, amount: any};
    transport?: {type: any, speed: any};
}

function filterPrefabCalls(body: Statement[], methodName: string): CallStatement[] {
    return body.filter((x): x is CallStatement => {
        if (x.type !== "CallStatement") return false;
        const expr = x.expression;
        if (expr.type !== "CallExpression") return false;
        if (expr.base.type !== "MemberExpression") return false;
        return expr.base.base.type === "Identifier"
            && expr.base.base.name === "prefab"
            && expr.base.identifier.name === methodName;
    });
}

function getCallArgs(stmt?: CallStatement): any[] {
    if(!stmt) return [];
    return (stmt.expression as CallExpression).arguments as any[];
}

export function parsePrefabs() {
    const results: { [key: string]: Prefab } = {};
    const extras: { [key: string]: Prefab } = {};
    for(const file of dirWalk('data/scripts/prefabs')){
        if(!file.isFile() || !file.name.endsWith('.lua')) continue;
        const filepath = path.join(file.parentPath, file.name);
        let children: Statement[] = [];
        try{
            children = parseLuaFile(filepath, false).body;
        }catch(e){
            //console.error(filepath, e);
        }

        // if(!filterPrefabCalls(children, 'addItem').length) continue;

        const placementCalls = filterPrefabCalls(children, 'addPlacement');
        const creates = figureOutValue(getCallArgs(placementCalls[0])?.[0]?.fields[0]?.value?.arguments?.[0]);
        // const drops = figureOutValue(getCallArgs(placementCalls[0])?.[0]?.fields[0]?.value?.arguments?.[0]);

        const id = file.parentPath.split(path.sep).at(-1) + "." + file.name.replace(/\.lua/, "");

        
        const fuelCalls = filterPrefabCalls(children, 'addFuel');
        let bio = undefined;
        let mana = undefined;
        if(fuelCalls.length > 0){
            const fuelArgs = getCallArgs(fuelCalls[0])?.[0];
            const fuelType = figureOutValue(fuelArgs?.fields[0]?.value);
            if(fuelType === 'FuelTypes.Biofuel'){
                bio = figureOutValue(fuelArgs?.fields[1]?.value);
            }
            if(fuelType === 'FuelTypes.Mana'){
                mana = figureOutValue(fuelArgs?.fields[1]?.value);
            }
        }

        const transportCalls = filterPrefabCalls(children, 'addTransport');
        let transport = undefined;
        if(transportCalls.length > 0){
            const transportType = figureOutValue(getCallArgs(transportCalls[0])?.[0]?.fields[0]?.value);
            const transportSpeed = figureOutValue(getCallArgs(transportCalls[0])?.[0]?.fields[1]?.value);
            transport = {type: transportType, speed: transportSpeed};
        }


        const matterCalls = filterPrefabCalls(children, 'addMatter');
        let matter = undefined;
        if(matterCalls.length > 0){
            const matterArgs = getCallArgs(matterCalls[0])?.[0];
            const matterType = figureOutValue(matterArgs?.fields[0]?.value);
            const amount = figureOutValue(matterArgs?.fields[1]?.value);
            matter = {amount, type: "Unknown"};
            switch(matterType){
                case 'MatterType.Mineral':
                    matter.type = 'material.mineral';
                    break;
                case 'MatterType.Biomass':
                    matter.type = 'material.biomass';
                    break;
                case 'MatterType.Metal':
                    matter.type = 'material.metal';
                    break;
                case 'MatterType.Mana':
                    matter.type = 'material.mana';
                    break;
                default:
                    matter = undefined;
                    console.error('unknown matter type', matterType);
            }
        }

        const itemCalls = filterPrefabCalls(children, 'addItem');
        const itemArgs = getCallArgs(itemCalls[0])?.[0];
        const icon = figureOutValue(itemArgs?.fields[0]?.value);
        const stack = figureOutValue(itemArgs?.fields?.[1]?.value);

        const statsCalls = filterPrefabCalls(children, 'addStats');
        const statsFields = getCallArgs(statsCalls[0])?.[0]?.fields[0]?.value?.arguments?.[1]?.fields;
        const hp = figureOutValue(statsFields
            ?.find((x: any) => x?.value?.fields[0]?.value.raw === '"HP"')
            ?.value?.fields[1]?.value?.arguments?.[0]);
        const def = figureOutValue(statsFields
            ?.find((x: any) => x?.value?.fields[0]?.value.raw === '"DEF"')
            ?.value?.fields[1]?.value?.arguments?.[0]);
        const atk = figureOutValue(statsFields
            ?.find((x: any) => x?.value?.fields[0]?.value.raw === '"ATK"')
            ?.value?.fields[1]?.value?.arguments?.[0]);

        const collectorCalls = filterPrefabCalls(children, 'addCollector');
        const collector = figureOutValue(getCallArgs(collectorCalls[0])?.[0]?.fields[0]?.value);

        const plantCalls = filterPrefabCalls(children, 'addPlant');
        const plantName = figureOutValue(getCallArgs(plantCalls[0])?.[0]?.fields[0]?.value?.arguments?.[0]);

        const drillCalls = filterPrefabCalls(children, 'addDrill');
        const drillSpeed = figureOutValue(getCallArgs(drillCalls[0])?.[0]?.fields[0]?.value);

        const consumerCalls = filterPrefabCalls(children, 'addConsumer');
        const power = {
            idle: undefined,
            active: undefined,
        };
        if(consumerCalls.length > 0){
            // console.dir(getCallArgs(consumerCalls[0])?.[0]?.fields[0], {depth:null});
            getCallArgs(consumerCalls[0])?.[0]?.fields?.forEach((x: any) => {
                const key = x?.key?.name;
                const val = x?.value?.value;
                if(key === "idlePower") power.idle = val;
                if(key === "activePower") power.active = val;
            });
            
        }
        // const power = {
        //     idle: figureOutValue(consumerCalls
        //         .find((x: any) => x?.value?.fields[0]?.value.raw === '"idlePower"')
        //         ? getCallArgs(consumerCalls.find((x: any) => x?.value?.fields[0]?.value.raw === '"idlePower"')!)?.[0]?.fields[0]?.value
        //         : undefined),
        //     active: figureOutValue(consumerCalls
        //         .find((x: any) => x?.value?.fields[0]?.value.raw === '"activePower"')
        //         ? getCallArgs(consumerCalls.find((x: any) => x?.value?.fields[0]?.value.raw === '"activePower"')!)?.[0]?.fields[0]?.value
        //         : undefined),
        // };

        if(id){
            results[id] = {
                id,
                creates,
                icon,
                drillSpeed,
                power,
                collector,
                plantName,
                atk,
                def,
                stack,
                hp,
                bio,
                mana,
                matter,
                transport,
            };
        }else{
            const extraid = path.parse(file.parentPath).name + "." + file.name.replace(/\.lua/, "");
            extras[extraid] = {
                id: extraid,
                creates,
                icon,
                stack,
                drillSpeed,
                power,
                collector,
                plantName,
                atk,
                def,
                hp,
                bio,
                mana,
                matter,
                transport,
            };
        }
    }
    // console.dir(extras);
    Object.values(extras).forEach(x => {
       if(!Object.hasOwn(results, x.id)) results[x.id] = x;
       else {
           console.error('id collision', x.id);
       }
    });
    return results;
};


