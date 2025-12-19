export interface Project {
    name: string;
    quickDesc: string;
    img: string;
    expl: string;
}

export interface Projects {
    $schema?: string;
    projects: Project[];
}