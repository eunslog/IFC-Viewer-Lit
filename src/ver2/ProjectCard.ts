import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Project } from '../components/classes/Project';

@customElement('project-card')
export class ProjectCard extends LitElement {
  @property({ type: Object })
  project!: Project;

  static styles = css`
    .project-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin: 10px;
    }
    .card-header {
      display: flex;
      align-items: center;
      column-gap: 10px;
    }
    .card-header .hc {
      background-color: #ca8134;
      padding: 10px;
      border-radius: 8px;
      aspect-ratio: 1;
      color: white;
    }
    .card-header div {
      flex-grow: 1;
    }
    h5 {
      margin: 0;
      font-size: 1.2em;
    }
    p {
      margin: 0;
    }
    .card-content {
      margin-top: 16px;
    }
    .card-property {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
    }
    .card-property p:first-child {
      color: #969696;
    }
  `;

  render() {
    return html`
      <div class="project-card">
        <div class="card-header">
          <p class="hc">HC</p>
          <div>
            <h5>${this.project.name}</h5>
            <p>${this.project.description}</p>
          </div>
        </div>
        <div class="card-content">
          <div class="card-property">
            <p>Status</p>
            <p>${this.project.status}</p>
          </div>
          <div class="card-property">
            <p>Role</p>
            <p>${this.project.userRole}</p>
          </div>
          <div class="card-property">
            <p>Cost</p>
            <p>$${this.project.cost}</p>
          </div>
          <div class="card-property">
            <p>Estimated Progress</p>
            <p>${this.project.progress * 100}%</p>
          </div>
        </div>
      </div>
    `;
  }
}
