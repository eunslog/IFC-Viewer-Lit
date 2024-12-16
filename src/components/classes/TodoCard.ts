import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { FragmentIdMap } from '@thatopen/fragments';
import placeMarker from '../Toolbars/Sections/PlaceMarker';
import * as OBF from "@thatopen/components-front";
import { ProjectsManager } from "./ProjectsManager";
import * as THREE from "three";
import Groupings from "../Panels/Sections/Groupings";

export type ToDoPriority = "LOW" | "MEDIUM" | "HIGH";

export interface ToDo {
  id: number,
  content: string;
  writer: number,
  ifc: number,
  createDate: Date;
  deadline: Date;
  manager: number;
  manager_name: string,
  manager_position: string,
  fragmentMap: FragmentIdMap;
  priority: ToDoPriority;
}

interface Manager {
  name: string;
  position: string;
}


export default (components: OBC.Components, projectsManager: ProjectsManager) => {

  const fragmentsManager = components.get(OBC.FragmentsManager);
  const world = components.get(OBC.Worlds).list.values().next().value;

  const highlighter = components.get(OBF.Highlighter);
  // highlighter.setup({ world });
  // highlighter.zoomToSelection = true;

  const placeMarkerOnSelected = placeMarker(components, world);

  const onCardDeleteClick = new OBC.Event();
  const onCardEditClick = new OBC.Event();

  // highlighter.events.select.onHighlight.add((selection) => {
  //     console.log('Highlight event triggered with selection:', selection);
  // });

  const handleEditClick = (e: Event) => {
    e.stopPropagation();
    onCardEditClick.trigger();
  };

  const handleDeleteClick = (e: Event) => {
    e.stopPropagation();
    onCardDeleteClick.trigger();
  };

  const handleCreateClick = async () => {

    const descriptionInput = document.querySelector<HTMLInputElement>("#description-input");
    const deadlineInput = document.querySelector<HTMLInputElement>("#deadline-input");
    const priorityDropdown = document.querySelector<HTMLSelectElement>("#priority");
    const managerSelect = document.querySelector<HTMLSelectElement>("#manager-select");

    const selectedFragments = highlighter.selection.select;
    const fragmentKeys = Object.keys(selectedFragments);
  
    if (fragmentKeys.length === 0) {
      console.error("Please select at least one fragment before creating a TODO.");
      return;
    }
  
    const fragmentMap: { [key: string]: Set<number> } = {};
    const fragmentsManager = components.get(OBC.FragmentsManager);
  
    fragmentKeys.forEach((id) => {
      const normalizedId = id.trim().toLowerCase();
      if (fragmentsManager.list.has(normalizedId)) {
        fragmentMap[id] = new Set([0]);
      } else {
        console.warn(`Fragment ID ${id} is not valid or does not exist in fragmentsManager.`);
      }
    });
  
    if (Object.keys(fragmentMap).length === 0) {
      console.error("No valid fragments found to include in TODO.");
      return;
    }
  
    console.log("Saving fragmentMap:", fragmentMap);
    console.log("Available fragments in fragmentsManager.list:", Array.from(fragmentsManager.list.keys()));


    // Check Fragment, Model UUID
    const fragmentID = fragmentKeys[0];
    const fragment = fragmentsManager.list.get(fragmentID);

    if (!fragment || !fragment.mesh || !fragment.mesh.parent) {
      console.error("Fragment or its mesh/parent is not valid.");
      return;
    }

    const modelUUID = fragment.mesh.parent?.uuid;
    if (!modelUUID) {
      console.error('Not found Model UUID');
      return;
    }

    const ifcId = projectsManager.getIfcIdByModelUUID(modelUUID);

    if (!ifcId) {
      console.error('IFC ID not found for selected model');
      return;
    }
  
    // Check input
    if (!descriptionInput?.value.trim() || !deadlineInput?.value || !managerSelect?.value) {
      console.error("Please fill in all required fields.");
      return;
    }
  
    // Request TODO creation
    try {
      const requestBody = {
        content: descriptionInput.value,
        writer: 1,
        ifc: ifcId,
        manager: parseInt(managerSelect.value),
        deadline: deadlineInput.value,
        priority: priorityDropdown?.value || "LOW",
        fragmentMap: selectedFragments,
      };
  
      console.log("Request Body:", requestBody);
  
      const response = await fetch("http://localhost:3000/api/todo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const result = await response.json();
      console.log("Todo created:", result);
  
      // Update TODO list
      await updateToDoList();
  
      if (descriptionInput) descriptionInput.value = '';
      if (managerSelect) managerSelect.value = '';
      if (deadlineInput) deadlineInput.value = '';
      if (priorityDropdown) priorityDropdown.value = 'LOW';
      highlighter.clear("select");
    } catch (error) {
      console.error("Error creating todo:", error);
    }
  };
  
  const getPriorityValue = (priority: string): number => {
    switch (priority.toUpperCase()) {
        case 'HIGH': return 3;
        case 'MEDIUM': return 2;
        case 'LOW': return 1;
        default: return 0;
    }
  };


  const sortTodos = (todos: any[], sortBy: 'deadline' | 'priority') => {
    const sortedTodos = [...todos];
    
    if (sortBy === 'deadline') {
        sortedTodos.sort((a, b) => {
            const dateA = new Date(a.deadline);
            const dateB = new Date(b.deadline);
            return dateA.getTime() - dateB.getTime();
        });
    } else {
        sortedTodos.sort((a, b) => {
            const priorityA = getPriorityValue(a.priority);
            const priorityB = getPriorityValue(b.priority);
            if (priorityA === priorityB) {
                const dateA = new Date(a.deadline);
                const dateB = new Date(b.deadline);
                return dateA.getTime() - dateB.getTime();
            }
            return priorityB - priorityA;
        });
    }
    
    return sortedTodos;
  };


  const updateToDoList = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/todo');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const todos = await response.json();
        const todoListContainer = document.querySelector<HTMLElement>('#todo-list');
        
        if (!todoListContainer) {
            console.error('Todo list container not found');
            return;
        }

        const sortedTodos = sortTodos(todos, 'deadline');
        renderTodos(sortedTodos, todoListContainer);

    } catch (error) {
        console.error('Error updating todo list:', error);
      
      }
  };


  const renderTodos = (todos: any[], container: HTMLElement) => {

    // Sort dropdown
    const sortDropdown = document.createElement('bim-dropdown');
    sortDropdown.setAttribute('label', 'Sort By');

    // Deadline option
    const deadlineOption = document.createElement('bim-option');
    deadlineOption.setAttribute('label', 'Deadline');
    deadlineOption.id = 'deadline-sort';
    deadlineOption.addEventListener('click', () => {
      const sortedTodos = sortTodos(todos, 'deadline');
      renderTodos(sortedTodos, container);
    });
    sortDropdown.appendChild(deadlineOption);

    // Priority option
    const priorityOption = document.createElement('bim-option');
    priorityOption.setAttribute('label', 'Priority');
    priorityOption.id = 'priority-sort';
    priorityOption.addEventListener('click', () => {
        const sortedTodos = sortTodos(todos, 'priority');
        renderTodos(sortedTodos, container);
    });
    sortDropdown.appendChild(priorityOption);

    container.appendChild(sortDropdown);

    // Todos
    todos.forEach(todo => {
      const todoSection = createTodoSection(todo);
      container.appendChild(todoSection);
    });
  };


  // const trackFragment = (todo: ToDo) => {
  //   try {
  //       console.log('Starting trackFragment with todo:', todo);
        
  //       highlighter.highlightByID('select', todo.fragmentMap, true, true);
  //       console.log("Highlighting fragments:", todo.fragmentMap);

  //       world.camera.fit(world.meshes, 1.2);



  //   } catch (error) {
  //       console.error('Error in trackFragment:', error);
  //   }
  // };

  const trackFragment = (todo: ToDo) => {
    try {
      console.log('Starting trackFragment with todo:', todo);
  
      const highlighter = components.get(OBF.Highlighter);
      const fragmentsManager = components.get(OBC.FragmentsManager);
  
      // Fragment UUID matching
      const fragments: { [key: string]: Set<number> } = {};
      const availableFragments = Array.from(fragmentsManager.list.keys()).map((id) => id.trim().toLowerCase());
  
      Object.keys(todo.fragmentMap).forEach((rawId) => {
        const normalizedId = rawId.trim().toLowerCase();
        if (availableFragments.includes(normalizedId)) {
          fragments[rawId] = todo.fragmentMap[rawId];
        } else {
          console.warn(`Invalid UUID detected: ${rawId}`);
        }
      });
  
      if (Object.keys(fragments).length === 0) {
        console.error("No valid fragments to highlight.");
        return;
      }
  
      console.log('Fragments to highlight:', fragments);
  
      // Highlight fragments
      highlighter.highlightByID('select', fragments, true);
      console.log("Highlight applied successfully");
  
      // Camera focus on highlighted fragments
      const center = new THREE.Vector3();
      let count = 0;
  
      Object.keys(fragments).forEach((id) => {
        const fragment = fragmentsManager.list.get(id);
        if (!fragment?.mesh) {
          console.warn(`Fragment with ID ${id} does not have a valid mesh.`);
          return;
        }
  
        const box = new THREE.Box3().setFromObject(fragment.mesh);
        if (!box.isEmpty()) {
          const fragmentCenter = new THREE.Vector3();
          box.getCenter(fragmentCenter);
          center.add(fragmentCenter);
          count++;
        }
      });
  
      if (count > 0) {
        center.divideScalar(count);
  
        const camera = components.get(OBC.SimpleCamera);
        const offset = 10;
  
        camera.controls.setLookAt(
          center.x + offset,
          center.y + offset,
          center.z + offset,
          center.x,
          center.y,
          center.z,
          true
        );
      }
    } catch (error) {
      console.error('Error in trackFragment:', error);
    }
  };
    


  const createTodoSection = (todo: ToDo) => {

    const todoSection = document.createElement('div');
    const panelSection = document.createElement('bim-panel-section');
  
    panelSection.setAttribute('label', todo.content);
    panelSection.setAttribute('icon', 'mdi:card-text-outline');
  
    // Manager
    const managerLabel = document.createElement('bim-label');
    managerLabel.textContent = `Manager: ${todo.manager_name} [${todo.manager_position}]`;
    panelSection.appendChild(managerLabel);
  
    // Deadline
    const deadlineLabel = document.createElement('bim-label');
    const todoDate = new Date(todo.deadline).toLocaleDateString();
    deadlineLabel.textContent = `Deadline: ${todoDate}`;
    panelSection.appendChild(deadlineLabel);
  
    // Priority
    const priorityLabel = document.createElement('bim-label');
    priorityLabel.textContent = `Priority: ${todo.priority}`;
    panelSection.appendChild(priorityLabel);
  
    // Track Button
    const trackButton = document.createElement('bim-button');
    trackButton.setAttribute('label', 'Track');
    trackButton.id = `track-${todo.id}`;
    trackButton.addEventListener('click', () => {
      trackFragment(todo);
    });
    panelSection.appendChild(trackButton);
    todoSection.appendChild(panelSection);
  
  
    return todoSection;
  };
    
  

  const createManagerDropdown = () => {

    const dropdown = BUI.Component.create(() => {
      return BUI.html`
        <bim-dropdown id="manager-select" label="Manager"></bim-dropdown>
      `;
    });

    // Update managers list
    fetch('http://localhost:3000/api/manager')
      .then(response => response.json())
      .then(managers => {
        dropdown.innerHTML = managers
          .map((manager: { id: number, name: string, position: string }) => `
            <bim-option 
              label="${manager.name} [${manager.position}]" 
              value="${manager.id}"
            ></bim-option>
          `)
          .join('');
      })
      .catch(error => {
        console.error('Error loading managers:', error);
      });

    return dropdown;

  };

  const fragment = BUI.Component.create(() => {
    
    const managerDropdown = createManagerDropdown();

    const initTodoList = () => {
      const todoListContainer = document.querySelector<HTMLElement>('#todo-list');
      if (todoListContainer) {
        updateToDoList();
      } else {
        setTimeout(initTodoList, 100);
      }
    };

    setTimeout(initTodoList, 0);

    return BUI.html`
      <bim-panel-section label="Todo" icon="mdi:clipboard-list">
        <bim-panel-section label="New Todo" icon="mdi:card-text">
          <bim-label>Description</bim-label>
          <bim-text-input 
            id="description-input" 
            vertical 
            placeholder="Please write a description.">
          </bim-text-input>
            ${managerDropdown}
          <bim-label>Deadline</bim-label>
          <bim-text-input 
            id="deadline-input" 
            type="date" 
            vertical 
            placeholder="Deadline">
          </bim-text-input>
          <bim-dropdown id="priority" label="Priority">
            <bim-option label="LOW"></bim-option>
            <bim-option label="MEDIUM"></bim-option>
            <bim-option label="HIGH"></bim-option>
          </bim-dropdown>
          <bim-button 
            @click=${handleCreateClick} 
            label="Create Todo"
          ></bim-button>
        </bim-panel-section>
        <bim-panel-section 
          label="Todo List" 
          icon="mdi:format-list-bulleted" 
          id="todo-list" 
          style="margin-top: 1rem;"
        >
        </bim-panel-section>
      </bim-panel-section>
    `;
  });

  return fragment;
}