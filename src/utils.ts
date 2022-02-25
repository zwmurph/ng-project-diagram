// Converts an array of objects to a lookup of the same objects
export function getLookupFromArray<T extends { name: string }>(array: T[]): LookupObject<T> | undefined {
    // eslint-disable-next-line
    if (array == null || array.length === 0) {
        return undefined;
    } else {
        return array.reduce((map, obj) => {
            map[obj.name] = obj;
            return map;
        }, {} as LookupObject<T>);
    }
}

// Returns HTML content for the Webview to render
export function getWebviewContent(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello World</title>
</head>
<body>
    <h1>Hello World</h1>
</body>
</html>
    `;
}

export type LookupObject<T> = {
    [key: string]: T;
};
