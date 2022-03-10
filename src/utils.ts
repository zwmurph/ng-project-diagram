/**
 * Converts an array of objects to a lookup of the same objects.
 * @param array Input array - must have a property 'name'.
 * @returns LookupObject.
 */
export function getLookupFromArray<T extends { name: string }>(array: T[]): LookupObject<T> | undefined {
    if (array == null || array.length === 0) {
        return undefined;
    } else {
        return array.reduce((map, obj) => {
            map[obj.name] = obj;
            return map;
        }, {} as LookupObject<T>);
    }
}

/**
 * Get a random 32-character token. Used for security.
 * @returns A token comprising of upper-case and lower-case alpha-numeric characters.
 */
export function getToken(): string {
    let token = '';
    const possibleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		token += possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
	}
	return token;
} 

export type LookupObject<T> = {
    [key: string]: T;
};
