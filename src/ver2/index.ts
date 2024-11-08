// import { html, LitElement, css } from 'lit';
// import { customElement, state, property } from 'lit/decorators.js';
// import './ProjectsPage';
// import './IFCPage';
// import { ProjectsManager } from './classes/ProjectsManager';
// import { render as litRender, TemplateResult } from 'lit';

// const projectsManager = new ProjectsManager();

// @customElement('app-root')
// class AppRoot extends LitElement {
//   static styles = css`
//     main {
//       display: flex;
//       flex-direction: column;
//     }
//   `;

//   @state() currentPath: string = window.location.pathname;

//   connectedCallback() {
//     super.connectedCallback();
//     window.addEventListener('popstate', this.handleRouting.bind(this));
//   }

//   disconnectedCallback() {
//     window.removeEventListener('popstate', this.handleRouting.bind(this));
//     super.disconnectedCallback();
//   }

//   public handleRouting() {
//     this.currentPath = window.location.pathname;
//     this.requestUpdate();
//   }

//   render() {
//     return html`
//       <main id="app">
//         ${this.currentPath === '/'
//           ? html`<projects-page .projectsManager=${projectsManager}></projects-page>`
//           : this.currentPath.startsWith('/project/')
//           ? (() => {
//               const projectId = this.currentPath.split('/project/')[1];
//               return html`<ifc-page .projectId=${projectId} .projectsManager=${projectsManager}></ifc-page>`;
//             })()
//           : html`<div>Page not found</div>`}
//       </main>
//     `;
//   }
// }

// const navigateTo = (path: string) => {
//   window.history.pushState({}, '', path);
//   const appRoot = document.querySelector('app-root') as AppRoot;
//   if (appRoot) {
//     appRoot.handleRouting();
//   }
// };

// // Initialize the application by adding app-root to the DOM
// const rootElement = document.getElementById('app');
// if (rootElement) {
//   const appRoot = document.createElement('app-root');
//   rootElement.appendChild(appRoot);
// }

import { html, LitElement, css } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import './ProjectsPage';
import './IFCPage';
import { ProjectsManager } from './classes/ProjectsManager';
import { render as litRender, TemplateResult } from 'lit';

export @customElement('app-root')
class AppRoot extends LitElement {
  static styles = css`
    main {
      display: flex;
      flex-direction: column;
    }
  `;

  @state() currentPath: string = window.location.pathname;
  @state() private projectsManager: ProjectsManager | null = null;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('popstate', this.handleRouting.bind(this));
    this.projectsManager = new ProjectsManager(); // projectsManager 초기화
  }

  disconnectedCallback() {
    window.removeEventListener('popstate', this.handleRouting.bind(this));
    super.disconnectedCallback();
  }

  public handleRouting() {
    this.currentPath = window.location.pathname;
    this.requestUpdate();
  }

  render() {
    if (!this.projectsManager) {
      return html`<div>Loading...</div>`; 
    }

    return html`
      <main id="app">
        ${this.currentPath === '/'
          ? html`<projects-page .projectsManager=${this.projectsManager}></projects-page>`
          : this.currentPath.startsWith('/project/')
          ? (() => {
              const projectId = this.currentPath.split('/project/')[1];
              return html`<ifc-page .projectId=${projectId} .projectsManager=${this.projectsManager}></ifc-page>`;
            })()
          : html`<div>Page not found</div>`}
      </main>
    `;
  }
}

const navigateTo = (path: string) => {
  window.history.pushState({}, '', path);
  const appRoot = document.querySelector('app-root') as AppRoot;
  if (appRoot) {
    appRoot.handleRouting();
  }
};

// Initialize the application by adding app-root to the DOM
const rootElement = document.getElementById('app');
if (rootElement) {
  const appRoot = document.createElement('app-root');
  rootElement.appendChild(appRoot);
}
