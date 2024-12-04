import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { FragmentIdMap } from '@thatopen/fragments';
export type ToDoPriority = "Low" | "Medium" | "High";

export interface ToDo {
  description: string;
  createDate: Date;
  deadline: Date;
  manager: Number;
  fragmentMap: FragmentIdMap;
  priority: ToDoPriority;
}

interface Manager {
  name: string;
  position: string;
}


export default (components: OBC.Components) => {
  // const onCardClick = new OBC.Event();
  const onCardDeleteClick = new OBC.Event();
  const onCardEditClick = new OBC.Event();
  const todoList: ToDo[] = [];
  // const handleCardClick = () => {
  //   onCardClick.trigger();
  // };
  let managers: Manager[] = [];

  async function loadManagers() {
    try {
      const response = await fetch('http://localhost:3000/api/projects/manager');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      managers = await response.json();
      console.log('Managers loaded:', managers);
      
      const dropdown = document.getElementById('manager-select') as any;
      if (dropdown) {
        dropdown.innerHTML = '';
        managers.forEach(manager => {
          const option = document.createElement('bim-option');
          option.setAttribute('label', `${manager.name} (${manager.position})`);
          option.setAttribute('value', manager.name);
          dropdown.appendChild(option);
        });
      }
      
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  }


  loadManagers();

  const handleEditClick = (e: Event) => {
    e.stopPropagation();
    onCardEditClick.trigger();
  };

  const handleDeleteClick = (e: Event) => {
    e.stopPropagation();
    onCardDeleteClick.trigger();
  };

  const handleCreateClick = () => {
    const descriptionInput = document.querySelector<HTMLInputElement>('#description-input');
    const deadlineInput = document.querySelector<HTMLInputElement>('#deadline-input');
    const priorityInput = document.querySelector<BUI.Dropdown>('#priority-dropdown');
    const managerInput = document.querySelector<HTMLInputElement>('#manager-input');
    if (descriptionInput && managerInput && deadlineInput && priorityInput) {
      const newToDo: ToDo = {
        description: descriptionInput.value,
        createDate: new Date(),
        manager: parseInt(managerInput.value, 10),
        deadline: new Date(deadlineInput.value),
        fragmentMap: {},
        priority: priorityInput.value[0] as ToDoPriority,
      };
      todoList.push(newToDo);
      descriptionInput.value = '';
      managerInput.value = '';
      deadlineInput.value = '';
      priorityInput.value = ['Low'];
      updateToDoList();
    }
  };

  const updateToDoList = () => {
    const todoListContainer = document.querySelector<HTMLElement>('#todo-list');
    if (todoListContainer) {
      todoListContainer.innerHTML = '';
      todoList.forEach(todo => {
        const todoItem = document.createElement('div');
        todoItem.innerHTML = `
          <bim-panel-section label="${todo.description}" icon="mdi:card-text-outline">
            <bim-label>Manager: ${todo.manager}</bim-label>
            <bim-label>Deadline: ${todo.deadline.toDateString()}</bim-label>
            <bim-label>Priority: ${todo.priority}</bim-label>
          </bim-panel-section>
        `;
        todoListContainer.appendChild(todoItem);
      });
    }
  };


  const fragment = BUI.Component.create(() => {
    
    const dropdown = BUI.Component.create(() => {
      return BUI.html`
        <bim-dropdown id="manager-select" label="Manager">
          <bim-option label="Loading..." value=""></bim-option>
        </bim-dropdown>
      `;
    });

    // Get manager list from database
    fetch('http://localhost:3000/api/projects/manager')
      .then(response => response.json())
      .then(managers => {
        dropdown.innerHTML = managers.map((manager: { name: any; position: any; }) => `
          <bim-option label="${manager.name} [${manager.position}]" value="${manager.name}"></bim-option>
        `).join('');
      })
      .catch(error => console.error('Error loading managers:', error));

    return BUI.html`
      <bim-panel-section label="Todo" icon="mdi:clipboard-list">
        <bim-panel-section label="New Todo" icon="mdi:card-text">
          <bim-label>Description</bim-label>
          <bim-text-input id="description-input" vertical placeholder="Please write a description."></bim-text-input>
            ${dropdown}
          <bim-label>Deadline</bim-label>
          <bim-text-input id="deadline-input" type="date" vertical placeholder="Deadline"></bim-text-input>
          <bim-dropdown label="Priority">
            <bim-option label="Low"></bim-option>
            <bim-option label="Medium"></bim-option>
            <bim-option label="High"></bim-option>
          </bim-dropdown>
          <bim-button @click=${handleCreateClick} label="Create Todo"></bim-button>
        </bim-panel-section>
         <bim-panel-section label="Todo List" icon="mdi:format-list-bulleted" id="todo-list" style="margin-top: 1rem;">
         </bim-panel-section>
      </bim-panel-section>
    `;
  });

  return fragment;
}