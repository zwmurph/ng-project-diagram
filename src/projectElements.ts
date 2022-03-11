import { WorkspaceSymbols } from "ngast";
import { getLookupFromArray, LookupObject } from "./utils";

/**
 * Class that resolves and holds all symbols for the Angular project.
 */
export class ProjectElements {
    private workspaceSymbols: WorkspaceSymbols;

    private _projectModules: ProjectModule[];
    public get modules(): ProjectModule[] {
        return this._projectModules;
    }
    
    private _projectComponents: ProjectComponent[];
    public get components(): ProjectComponent[] {
        return this._projectComponents;
    }

    private _projectInjectables: ProjectInjectable[];
    public get injectables(): ProjectInjectable[] {
        return this._projectInjectables;
    }

    constructor(private readonly tsconfigPath: string) { }

    /**
     * Resolves all symbols within the project.
     * MUST be called before accessing symbols or their lookups.
     */
    public resolveAllWorkspaceSymbols(): void {
        this.workspaceSymbols = new WorkspaceSymbols(this.tsconfigPath);

        this._projectModules = this.resolveProjectModules();
        this._projectComponents = this.resolveProjectComponents();
        this._projectInjectables = this.resolveProjectInjectables();

        // TODO: Directives and pipes at a later time, if needed
        // this.workspaceSymbols.getAllDirectives();
        // this.workspaceSymbols.getAllPipes();
    }

    /**
     * Gets a lookup for a given symbol type.
     * @param symbolType 'module' | 'component' | 'injectable'.
     * @returns Lookup object or undefined if invalid `symbolType` is provided.
     */
    public getWorkspaceSymbolLookup(symbolType: 'module' | 'component' | 'injectable'): LookupObject<ProjectModule | ProjectComponent | ProjectInjectable> | undefined {
        if (symbolType === 'module') {
            return getLookupFromArray(this._projectModules);
        } else if (symbolType === 'component') {
            return getLookupFromArray(this._projectComponents);
        } else if (symbolType === 'injectable') {
            return getLookupFromArray(this._projectInjectables);
        } else {
            return undefined;
        }
    }

    /**
     * Gets project modules.
     * @returns Array of modules.
     */
    private resolveProjectModules(): ProjectModule[] {
        return this.workspaceSymbols.getAllModules().map((module) => ({
            name: module.name,
            path: module.path,
            imports: module.getImports().map((imp) => imp.name),
            declarations: module.getDeclarations().map((declaration) => declaration.name),
            providers: null // TODO: Linked to providedIn-TODO for project injectables
        } as ProjectModule));
    }

    /**
     * Gets project components.
     * @returns Array of components.
     */
    private resolveProjectComponents(): ProjectComponent[] {
        return this.workspaceSymbols.getAllComponents().map((component) => {
            // Map details from all found components
            const componentObj: ProjectComponent = {
                name: component.name,
                path: component.path,
                selector: component.metadata.selector === null ? '' : component.metadata.selector,
                injectedDependencies: [],
            };

            // Find names of injected dependencies in component and add to details list
            if (component.deps != null && component.deps !== "invalid" && component.deps.length > 0) {
                component.deps.forEach((dependency) => {
                    const dependencyObj = JSON.parse(JSON.stringify(dependency));
                    const dependencyName: string = dependencyObj?.token?.value?.name;
                    componentObj.injectedDependencies.push(dependencyName);
                });
            }
            return componentObj;
        });
    }

    /**
     * Gets project injectables (services).
     * @returns Array of injectables.
     */
    private resolveProjectInjectables(): ProjectInjectable[] {
        // Map details from all found injectables
        return this.workspaceSymbols.getAllInjectable().map((injectable) => ({
            name: injectable.name,
            path: injectable.path,
            providedIn: null // TODO: injectable.metadata.providedIn.node.text
        } as ProjectInjectable));
    }
}

export interface ProjectModule {
    name: string;
    path: string;
    imports: string[];
    declarations: string[];
    providers: string[] | null;
};

export interface ProjectComponent {
    name: string,
    path: string,
    selector: string,
    injectedDependencies: string[],
}

export interface ProjectInjectable {
    name: string,
    path: string,
    providedIn: string | null,
}
