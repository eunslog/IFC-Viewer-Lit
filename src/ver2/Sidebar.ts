import { html, LitElement, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Router } from '@lit-labs/router';
// import { ViewerProvider } from './IFCViewer';
// import { TodoCreator } from '../bim-components/TodoCreator';

@customElement('sidebar-component')
export class Sidebar extends LitElement {
  @state() viewer: any = null;

  static styles = css`
    #sidebar {
      width: 250px;
      background-color: #f4f4f4;
      padding: 20px;
      box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
    }
    #company-logo {
      width: 100%;
      margin-bottom: 20px;
    }
    #nav-buttons {
      list-style: none;
      padding: 0;
    }
    #nav-buttons li {
      cursor: pointer;
      padding: 10px;
      margin: 5px 0;
      display: flex;
      align-items: center;
      background-color: #fff;
      border-radius: 5px;
      transition: background-color 0.3s;
    }
    #nav-buttons li:hover {
      background-color: #e0e0e0;
    }
    .material-icons-round {
      margin-right: 10px;
    }
  `;

//   connectedCallback() {
//     super.connectedCallback();
//     this.viewer = ViewerProvider.getViewer();
//   }

//   private async createTodo() {
//     if (!this.viewer) return;
//     const todoCreator = await this.viewer.tools.get(TodoCreator);
//     todoCreator.addTodo('My custom todo', 'Medium');
//   }

  render() {
    return html`
      <aside id="sidebar">
        <img id="company-logo" src="../assets/company-logo.svg" alt="Construction Company" />
        <ul id="nav-buttons">
          <li @click=${() => window.location.href = '/'}>
            <span class="material-icons-round">apartment</span>Projects
          </li>
          <li @click=${() => this.navigateToUsers()}> 
            <span class="material-icons-round">people</span>Users
          </li>
        </ul>
      </aside>
    `;
  }
  
  private navigateToUsers() {
    console.log('Navigate to Users');
  }
  
}