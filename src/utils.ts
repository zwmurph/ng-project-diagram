// Converts an array of objects to a lookup of the same objects
export function getLookupFromArray<T extends { name: String }>(array: T[]): LookupObject<T> {
    return array.reduce((map, obj) => {
        map[obj.name.toString()] = obj;
        return map;
    }, {} as LookupObject<T>);
}

export type LookupObject<T> = {
    [key: string]: T;
};
