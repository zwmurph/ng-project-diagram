// Converts an array of objects to a lookup of the same objects
export function getLookupFromArray<T extends { name: string }>(array: T[]): LookupObject<T> {
    return array.reduce((map, obj) => {
        map[obj.name] = obj;
        return map;
    }, {} as LookupObject<T>);
}

export type LookupObject<T> = {
    [key: string]: T;
};
