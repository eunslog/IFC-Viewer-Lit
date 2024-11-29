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
export default (components: OBC.Components) => {
  // const onCardClick = new OBC.Event();
  const onCardDeleteClick = new OBC.Event();
  const onCardEditClick = new OBC.Event();
  const todoList: ToDo[] = [];
  // const handleCardClick = () => {
  //   onCardClick.trigger();
  // };
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
  return BUI.Component.create<BUI.Panel>(() => {
    return BUI.html`
      <bim-panel>
        <bim-panel-section label="Todo" icon="mdi:card-text">
          <bim-label>Description</bim-label>
          <bim-text-input id="description-input" vertical placeholder="Please write a description."></bim-text-input>
          <bim-label>Manager</bim-label>
          <bim-number-input id="manager-input" vertical placeholder="Please write a manager number."></bim-number-input>
          <bim-label>Deadline</bim-label>
          <bim-text-input id="deadline-input" type="date" vertical placeholder="Deadline"></bim-text-input>
          <bim-dropdown label="Priority">
            <bim-option label="Low"></bim-option>
            <bim-option label="Medium"></bim-option>
            <bim-option label="High"></bim-option>
          </bim-dropdown>
          <bim-button @click="${handleCreateClick}" label="Create"></bim-button>
          <!-- <div id="priority-dropdown-container"></div> -->
        </bim-panel-section>
        <bim-panel-section label="Todo List" icon="mdi:format-list-bulleted" id="todo-list" style="margin-top: 1rem;"></bim-panel-section>
        <!-- <div class="action-buttons" style="display: flex; gap: 0.375rem;">
          <bim-button @click="${handleEditClick}" icon="edit"></bim-button>
          <bim-button @click="${handleDeleteClick}" icon="delete"></bim-button>
        </div> -->
      </bim-panel>
    `;
  });
};
