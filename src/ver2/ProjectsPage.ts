// import { html, LitElement, css } from 'lit';
// import { customElement, property, state } from 'lit/decorators.js';
// import { ProjectsManager } from './classes/ProjectsManager';
// import { Project, IProject, ProjectStatus, UserRole } from './classes/Project';
// import './ProjectCard';

// @customElement('projects-page')
// export class ProjectsPage extends LitElement {
//   @state() projects: Project[] = [];
//   @property({ type: Object }) projectsManager!: ProjectsManager;

//   static styles = css`
//     .page {
//       display: flex;
//       flex-direction: column;
//     }
//     .project {
//       border: 1px solid #ccc;
//       padding: 10px;
//       margin: 10px;
//     }
//     header {
//       display: flex;
//       flex-direction: column;
//       align-items: flex-start;
//     }
//     button,
//     .action-icon {
//       cursor: pointer;
//     }
//     form {
//       display: flex;
//       flex-direction: column;
//     }
//     .input-list {
//       margin-bottom: 20px;
//     }
//     input[type='text'] {
//       width: 100%;
//       height: 40px;
//       padding: 5px;
//       background-color: var(--background-100);
//     }
//     .card-header p {
//       background-color: var(--main-color);
//       padding: 10px;
//       border-radius: 8px;
//       color: white;
//       aspect-ratio: 1;
//     }
//     .card-property p:first-child {
//       color: var(--text-color);
//     }
//     .card-property p {
//       margin: 0;
//     }
//     #projects-list {
//       display: flex;
//       flex-wrap: wrap;
//       gap: 10px;
//     }
//   `;

//   connectedCallback() {
//     super.connectedCallback();
//     if (this.projectsManager) {
//       this.projects = [...this.projectsManager.list];
//       this.projectsManager.onProjectCreated = () => {
//         this.updateProjects();
//       };
//       this.projectsManager.onProjectDeleted = () => {
//         this.updateProjects();
//       };
//     } else {
//       console.error('ProjectsManager is not provided to ProjectsPage component.');
//     }
//   }

//   updated(changedProperties: Map<string | number | symbol, unknown>) {
//     if (changedProperties.has('projects')) {
//       console.log('Projects state updated', this.projects);
//     }
//   }

//   private updateProjects() {
//     if (this.projectsManager) {
//       this.projects = [...this.projectsManager.list];
//     }
//   }

//   private onNewProjectClicked() {
//     const modal = this.shadowRoot?.getElementById('new-project-modal') as HTMLDialogElement;
//     modal?.showModal();
//   }

//   private onFormSubmit(e: Event) {
//     e.preventDefault();
//     if (!this.projectsManager) {
//       console.error('ProjectsManager is not initialized.');
//       return;
//     }

//     const form = this.shadowRoot?.getElementById('new-project-form') as HTMLFormElement;
//     if (!form) return;

//     const formData = new FormData(form);
//     const projectData: IProject = {
//       name: formData.get('name') as string,
//       description: formData.get('description') as string,
//       status: formData.get('status') as ProjectStatus,
//       userRole: formData.get('userRole') as UserRole,
//       finishDate: new Date(formData.get('finishDate') as string),
//       ifc_data: new Uint8Array(),
//     };

//     try {
//       this.projectsManager.newProject(projectData);
//       form.reset();
//       const modal = this.shadowRoot?.getElementById('new-project-modal') as HTMLDialogElement;
//       modal?.close();
//     } catch (err) {
//       alert(err);
//     }
//   }

//   private onProjectSearch(e: Event) {
//     const value = (e.target as HTMLInputElement).value;
//     if (this.projectsManager) {
//       this.projects = this.projectsManager.filterProjects(value);
//     }
//   }

//   private handleCardClick(projectId: string) {
//     navigateTo(`/project/${projectId}`);
//   }

//   render() {
//     if (!this.projectsManager) {
//       return html`<div>Loading Projects...</div>`;
//     }

//     return html`
//       <div class="page" id="projects-page">
//         <dialog id="new-project-modal">
//           <form @submit=${this.onFormSubmit} id="new-project-form">
//             <h2>New Project</h2>
//             <div class="input-list">
//               <div class="form-field-container">
//                 <label>
//                   <span>Name</span>
//                   <input name="name" type="text" placeholder="Project name" />
//                 </label>
//               </div>
//               <div class="form-field-container">
//                 <label>
//                   <span>Description</span>
//                   <textarea
//                     name="description"
//                     cols="30"
//                     rows="5"
//                     placeholder="Project description"></textarea>
//                 </label>
//               </div>
//               <div class="form-field-container">
//                 <label>
//                   <span>Role</span>
//                   <select name="userRole">
//                     <option>Architect</option>
//                     <option>Engineer</option>
//                     <option>Developer</option>
//                   </select>
//                 </label>
//               </div>
//               <div class="form-field-container">
//                 <label>
//                   <span>Status</span>
//                   <select name="status">
//                     <option>Pending</option>
//                     <option>Active</option>
//                     <option>Finished</option>
//                   </select>
//                 </label>
//               </div>
//               <div class="form-field-container">
//                 <label>
//                   <span>Finish Date</span>
//                   <input name="finishDate" type="date" />
//                 </label>
//               </div>
//               <div style="display: flex; margin: 10px 0px 10px auto; column-gap: 10px;">
//                 <button type="submit" style="background-color: rgb(18, 145, 18);">
//                   Accept
//                 </button>
//               </div>
//             </div>
//           </form>
//         </dialog>
//         <header>
//           <h2>Projects</h2>
//           <input @input=${this.onProjectSearch} type="text" placeholder="Search Projects" />
//           <button @click=${this.onNewProjectClicked} id="new-project-btn">Add New Project</button>
//         </header>
//         ${this.projects.length > 0
//           ? html`<div id="projects-list">
//               ${this.projects.map(
//                 (project) => html`
//                   <div @click=${() => this.handleCardClick(project.id)}>
//                     <project-card .project=${project}></project-card>
//                   </div>
//                 `
//               )}
//             </div>`
//           : html`<p>There are no projects to display!</p>`}
//       </div>
//     `;
//   }
// }

// // 라우팅 기능 추가
// const navigateTo = (path: string) => {
//   window.history.pushState({}, '', path);
//   const appRoot = document.querySelector('app-root') as AppRoot;
//   if (appRoot) {
//     appRoot.handleRouting();
//   }
// };


import { html, LitElement, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ProjectsManager } from './classes/ProjectsManager';
import { Project, IProject, ProjectStatus, UserRole } from './classes/Project';
import './ProjectCard';
import './SearchBox';
import type { AppRoot } from './index'; // AppRoot를 타입으로 가져옴

@customElement('projects-page')
export class ProjectsPage extends LitElement {
  @state() projects: Project[] = [];
  @property({ type: Object }) projectsManager!: ProjectsManager;

  static styles = css`
    .page {
      display: flex;
      flex-direction: column;
    }
    .project {
      border: 1px solid #ccc;
      padding: 10px;
      margin: 10px;
    }
    header {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    button,
    .action-icon {
      cursor: pointer;
    }
    form {
      display: flex;
      flex-direction: column;
    }
    .input-list {
      margin-bottom: 20px;
    }
    input[type='text'] {
      width: 100%;
      height: 40px;
      padding: 5px;
      background-color: var(--background-100);
    }
    .card-header p {
      background-color: var(--main-color);
      padding: 10px;
      border-radius: 8px;
      color: white;
      aspect-ratio: 1;
    }
    .card-property p:first-child {
      color: var(--text-color);
    }
    .card-property p {
      margin: 0;
    }
    #projects-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    if (this.projectsManager) {
      this.projects = [...this.projectsManager.list];
      this.projectsManager.onProjectCreated = () => {
        this.updateProjects();
      };
      this.projectsManager.onProjectDeleted = () => {
        this.updateProjects();
      };
    } else {
      console.error('ProjectsManager is not provided to ProjectsPage component.');
    }
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has('projects')) {
      console.log('Projects state updated', this.projects);
    }
  }

  private updateProjects() {
    if (this.projectsManager) {
      this.projects = [...this.projectsManager.list];
      console.log('Updated projects:', this.projects);
    }
  }

  private onNewProjectClicked() {
    const modal = this.shadowRoot?.getElementById('new-project-modal') as HTMLDialogElement;
    modal?.showModal();
  }

  private onFormSubmit(e: Event) {
    e.preventDefault();
    if (!this.projectsManager) {
      console.error('ProjectsManager is not initialized.');
      return;
    }

    const form = this.shadowRoot?.getElementById('new-project-form') as HTMLFormElement;
    if (!form) return;

    const formData = new FormData(form);
    const projectData: IProject = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      status: formData.get('status') as ProjectStatus,
      userRole: formData.get('userRole') as UserRole,
      finishDate: new Date(formData.get('finishDate') as string),
      ifc_data: new Uint8Array(),
    };

    try {
      this.projectsManager.newProject(projectData);
      form.reset();
      const modal = this.shadowRoot?.getElementById('new-project-modal') as HTMLDialogElement;
      modal?.close();
    } catch (err) {
      alert(err);
    }
  }

  private onProjectSearch(value: string) {
    console.log('Search value:', value);
    if (this.projectsManager) {
      this.projects = this.projectsManager.filterProjects(value);
      console.log('Filtered projects:', this.projects);
    }
  }

  private handleCardClick(projectId: string) {
    navigateTo(`/project/${projectId}`);
  }

  render() {
    if (!this.projectsManager) {
      return html`<div>Loading Projects...</div>`;
    }

    return html`
      <div class="page" id="projects-page">
        <dialog id="new-project-modal">
          <form @submit=${this.onFormSubmit} id="new-project-form">
            <h2>New Project</h2>
            <div class="input-list">
              <div class="form-field-container">
                <label>
                  <span>Name</span>
                  <input name="name" type="text" placeholder="Project name" />
                </label>
              </div>
              <div class="form-field-container">
                <label>
                  <span>Description</span>
                  <textarea
                    name="description"
                    cols="30"
                    rows="5"
                    placeholder="Project description"></textarea>
                </label>
              </div>
              <div class="form-field-container">
                <label>
                  <span>Role</span>
                  <select name="userRole">
                    <option>Architect</option>
                    <option>Engineer</option>
                    <option>Developer</option>
                  </select>
                </label>
              </div>
              <div class="form-field-container">
                <label>
                  <span>Status</span>
                  <select name="status">
                    <option>Pending</option>
                    <option>Active</option>
                    <option>Finished</option>
                  </select>
                </label>
              </div>
              <div class="form-field-container">
                <label>
                  <span>Finish Date</span>
                  <input name="finishDate" type="date" />
                </label>
              </div>
              <div style="display: flex; margin: 10px 0px 10px auto; column-gap: 10px;">
                <button type="submit" style="background-color: rgb(18, 145, 18);">
                  Accept
                </button>
              </div>
            </div>
          </form>
        </dialog>
        <header>
          <h2>Projects</h2>
          <search-box .onChange=${(value: string) => this.onProjectSearch(value)}></search-box>          <button @click=${this.onNewProjectClicked} id="new-project-btn">
            <span class="material-icons-round">add</span>New Project
          </button>
        </header>
        ${this.projects.length > 0
          ? html`<div id="projects-list">
              ${this.projects.map(
                (project) => html`
                  <div @click=${() => this.handleCardClick(project.id)}>
                    <project-card .project=${project}></project-card>
                  </div>
                `
              )}
            </div>`
          : html`<p>There are no projects to display!</p>`}
      </div>
    `;
  }
}

// 라우팅 기능 추가
const navigateTo = (path: string) => {
  window.history.pushState({}, '', path);
  const appRoot = document.querySelector('app-root') as AppRoot; // 여기서 AppRoot 타입 사용
  if (appRoot) {
    appRoot.handleRouting();
  }
};
