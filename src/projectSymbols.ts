import { WorkspaceSymbols } from "ngast";
import { getLookupFromArray } from "./utils";

export class ProjectElements {
    private workspaceSymbols: WorkspaceSymbols;
    
    constructor(private readonly tsconfigPath: string) {
        this.workspaceSymbols = new WorkspaceSymbols(tsconfigPath);

        // Modules
        const modules = this.resolveProjectModules();
        const modulesLookup = getLookupFromArray(modules);
        console.log("modulesLookup", modulesLookup);

        // Components
        const components = this.resolveProjectComponents();
        const componentsLookup = getLookupFromArray(components);       
        console.log("componentsLookup", componentsLookup);

        // Injectables
        const injectables = this.resolveProjectInjectables();
        const injectablesLookup = getLookupFromArray(injectables);
        console.log('injectablesLookup', injectablesLookup);




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
        }));
    }

    // Gets project components
    private resolveProjectComponents(): ProjectComponent[] {
        return this.workspaceSymbols.getAllComponents().map((component) => {
            // Map details from all found components
            let componentObj: ProjectComponent = {
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
        })) as ProjectInjectable[];
    }
}

interface ProjectModule {
    name: String;
    path: String;
    imports: String[];
    declarations: String[];
    providers: String[] | null;
};

interface ProjectComponent {
    name: String,
    path: String,
    selector: String,
    injectedDependencies: String[],
}

interface ProjectInjectable {
    name: String,
    path: String,
    providedIn: String | null,
}
