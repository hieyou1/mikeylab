export class ProjectManager {
    private readonly DOM;

    private static readonly PROJECTS = {
        "aa-openflights": {
            "name": "AA -> OpenFlights Export Tool",
            "langs": ["TypeScript"],
            "summary": "Convert an American Airlines data export into the export format for OpenFlights. Makes for easy importing into popular services that allow users to visualize flight history.",
            "image": {
                "url": "dist/aa-openflights.svg",
                "alt": "Generic airplane icon to explicitly affiliate this project with aviation"
            },
            "icons": {
                "newtab": "https://aa-openflights.mikeylab.com",
                "github": "https://github.com/hieyou1/aa-openflights"
            }
        },
        "imap-link": {
            "name": "imap-link",
            "langs": ["Rust"],
            "summary": "A service to link IMAP mailboxes together across servers. Inspired by other IMAP-to-IMAP forwarders, imap-link is a project that is designed to run as a daemon (or similar) type service to grab new emails from one account and forward them to another one.",
            "image": {
                "url": "dist/imap-link.svg",
                "alt": "Email being forwarded to show the use case of the service"
            },
            "icons": {
                "github": "https://github.com/hieyou1/imap-link"
            }
        },
    };

    loadProjects() {
        for (const [id, projectData] of Object.entries(ProjectManager.PROJECTS)) {
            let project = document.createElement("section");
            project.id = id;
            project.classList.add("project");

            let projectImage = document.createElement("img");
            projectImage.src = projectData.image.url;
            projectImage.alt = projectData.image.alt;
            project.appendChild(projectImage);

            let projectInfo = document.createElement("div");

            let projectName = document.createElement("h3");
            projectName.textContent = projectData.name;
            projectInfo.appendChild(projectName);

            let projectMeta = document.createElement("ul");
            projectMeta.classList.add("project-meta");

            let projectLangs = document.createElement("li");
            projectLangs.textContent = projectData.langs.join(", ");
            projectMeta.appendChild(projectLangs);

            let projectId = document.createElement("li");
            projectId.classList.add("bulleted");
            projectId.textContent = id;
            projectMeta.appendChild(projectId);

            projectInfo.appendChild(projectMeta);

            let projectDescription = document.createElement("p");
            projectDescription.textContent = projectData.summary;
            projectInfo.appendChild(projectDescription);

            let projectIcons = document.createElement("div");
            projectIcons.classList.add("icons");

            for (const [iconName, url] of Object.entries(projectData.icons)) {
                let a = document.createElement("a");
                a.target = "_blank";
                a.href = url;

                a.innerHTML = `<svg class="bi" viewBox="0 0 32 32"><use xlink:href="dist/icons.svg#${iconName}"></svg>`;

                projectIcons.appendChild(a);
            }

            projectInfo.appendChild(projectIcons);

            project.appendChild(projectInfo);

            this.DOM.projects.section.appendChild(project);
        }

        this.DOM.projects.section.classList.remove("unloaded");
    }

    constructor(DOM: {
        projects: {
            section: HTMLElement
        }
    }) {
        this.DOM = DOM;
    }
}