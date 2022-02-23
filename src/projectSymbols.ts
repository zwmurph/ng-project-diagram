import { WorkspaceSymbols } from "ngast";

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
     * MUST be called before accessing symbols: 'modules', 'components', 'injectables'.
     */
    public resolveAllWorkspaceSymbols(): void {
        this.workspaceSymbols = new WorkspaceSymbols(this.tsconfigPath);

        this._projectModules = this.resolveProjectModules();
        this._projectComponents = this.resolveProjectComponents();
        this._projectInjectables = this.resolveProjectInjectables();

        
        // const modulesLookup = getLookupFromArray(this._projectModules);
        // const componentsLookup = getLookupFromArray(this._projectComponents);
        // const injectablesLookup = getLookupFromArray(this._projectInjectables);
        // console.log("modulesLookup", modulesLookup);
        // console.log("componentsLookup", componentsLookup);
        // console.log('injectablesLookup', injectablesLookup);

        // TODO: Directives and pipes at a later time
        // console.log('directives', this.workspaceSyms.getAllDirectives());
        // console.log('pipes', this.workspaceSyms.getAllPipes());
    }

    // Gets project modules
    private resolveProjectModules(): ProjectModule[] {
        return this.workspaceSymbols.getAllModules().map((module) => ({
            name: module.name,
            path: module.path,
            imports: module.getImports().map((imp) => imp.name),
            declarations: module.getDeclarations().map((declaration) => declaration.name),
            providers: null // TODO: Linked to providedIn-TODO for project injectables
        } as ProjectModule));
    }

    // Gets project components
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
            // eslint-disable-next-line
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

    // Gets project injectables (services)
    private resolveProjectInjectables(): ProjectInjectable[] {
        // Map details from all found injectables
        return this.workspaceSymbols.getAllInjectable().map((injectable) => ({
            name: injectable.name,
            path: injectable.path,
            providedIn: null // TODO: injectable.metadata.providedIn.node.text
        } as ProjectInjectable));
    }
}

interface ProjectModule {
    name: string;
    path: string;
    imports: string[];
    declarations: string[];
    providers: string[] | null;
};

interface ProjectComponent {
    name: string,
    path: string,
    selector: string,
    injectedDependencies: string[],
}

interface ProjectInjectable {
    name: string,
    path: string,
    providedIn: string | null,
}
