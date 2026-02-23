import { parseLuaFile, figureOutValue, dirWalk } from "../utils/utils";
import path from "path";
import { CallStatement, CallExpression, Statement } from "luaparse";

export interface Prefab {
    id: string;
    icon: any;
    stack: any;
    drillSpeed: any;
    power: { idle: any; active: any };
    collector: any;
    atk: any;
    def: any;
    hp: any;
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

        if(!filterPrefabCalls(children, 'addItem').length) continue;

        const placementCalls = filterPrefabCalls(children, 'addPlacement');
        const id = figureOutValue(getCallArgs(placementCalls[0])?.[0]?.fields[0]?.value?.arguments?.[0]);

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

        const drillCalls = filterPrefabCalls(children, 'addDrill');
        const drillSpeed = figureOutValue(getCallArgs(drillCalls[0])?.[0]?.fields[0]?.value);

        const consumerCalls = filterPrefabCalls(children, 'addConsumer');
        const power = {
            idle: figureOutValue(consumerCalls
                .find((x: any) => x?.value?.fields[0]?.value.raw === '"idle"')
                ? getCallArgs(consumerCalls.find((x: any) => x?.value?.fields[0]?.value.raw === '"idle"')!)?.[0]?.fields[0]?.value
                : undefined),
            active: figureOutValue(consumerCalls
                .find((x: any) => x?.value?.fields[0]?.value.raw === '"active"')
                ? getCallArgs(consumerCalls.find((x: any) => x?.value?.fields[0]?.value.raw === '"active"')!)?.[0]?.fields[0]?.value
                : undefined),
        };

        if(id){
            results[id] = {
                id,
                icon,
                drillSpeed,
                power,
                collector,
                atk,
                def,
                stack,
                hp,
            };
        }else{
            const extraid = path.parse(file.parentPath).name + "." + file.name.replace(/\.lua/, "");
            extras[extraid] = {
                id: extraid,
                icon,
                stack,
                drillSpeed,
                power,
                collector,
                atk,
                def,
                hp,
            };
        }
    }
    console.dir(extras);
    Object.values(extras).forEach(x => {
       if(!Object.hasOwn(results, x.id)) results[x.id] = x;
       else {
           console.error('id collision', x.id);
       }
    });
    return results;
};


