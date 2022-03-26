import * as fs from 'fs';
import { join } from 'path';

/**
 * Converts an array of objects to a lookup of the same objects.
 * @param array Input array - must have a property 'name'.
 * @returns Promise with LookupObject<T> once completed.
 */
export function getLookupFromArray<T extends { name: string }>(array: T[]): Promise<LookupObject<T>> {
    return new Promise<LookupObject<T>>((resolve, reject) => {
        if (array == null || array.length === 0) {
            reject('Array null or zero length.');
        } else {
            resolve(
                array.reduce((map, obj) => {
                    map[obj.name] = obj;
                    return map;
                }, {} as LookupObject<T>)
            );
        }
    });
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

/**
 * Saves a data URL as an image. Uses format defined in data URL.
 * @param dataUrl Data URL to convert.
 * @param workspaceRootPath Root path of workspace.
 */
export function saveDataUrlAsImage(dataUrl: string, workspaceRootPath: string): void {
    // Split the metadata from the data and make sure both parts are present
    const splitDataUrl: string[] = dataUrl.split(",");
    if (splitDataUrl.length !== 2) {
        throw new Error('Data URL does not contain required sections');
    }

    // Get the file extension from the metadata
    const matches = splitDataUrl[0].match(/^data:.+\/(.+);base64$/);
    if (matches == null || matches.length < 2) {
        throw new Error('Cannot obtain file extension from data URL metadata');
    }
    const extension = `.${matches[1]}`;

    // Get a buffer from the data  
    const buffer = Buffer.from(splitDataUrl[1], 'base64');

    // Check if an output folder already exists
    const outputFolder = join(workspaceRootPath, '.ng-project-diagram');
    if (!(fs.existsSync(outputFolder) && fs.lstatSync(outputFolder).isDirectory())) {
        // Create the new folder
        fs.mkdirSync(outputFolder);
    }

    // Check for same-name files and append a number if they already exist
    const fileName = 'project-diagram';
    let fullFilePath = join(outputFolder, `${fileName}${extension}`);
    let num = 0;
    while (fs.existsSync(fullFilePath)) {
        fullFilePath = join(outputFolder, `${fileName}_${++num}${extension}`);
    }

    // Write the data to file
    fs.writeFileSync(fullFilePath, buffer);
}

export type LookupObject<T> = {
    [key: string]: T;
};
