document.addEventListener('DOMContentLoaded', () => {
  const taskInput = document.getElementById('taskInput');
  const addTaskBtn = document.getElementById('addTask');
  const tasksList = document.getElementById('tasksList');
  const currentDate = document.getElementById('currentDate');

  // Display current date
  const today = new Date();
  currentDate.textContent = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Load tasks from storage
  loadTasks();

  addTaskBtn.addEventListener('click', () => {
    const taskText = taskInput.value.trim();
    if (taskText) {
      const subtasks = generateSubtasks(taskText);
      const task = {
        id: Date.now(),
        title: taskText,
        subtasks: subtasks,
        date: today.toDateString()
      };
      saveTask(task);
      renderTask(task);
      taskInput.value = '';
    }
  });

  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTaskBtn.click();
    }
  });

  function generateSubtasks(task) {
    const taskLower = task.toLowerCase();

    const patterns = {
      write: [
        'Research and gather relevant information',
        'Create an outline with main points',
        'Write the first draft',
        'Review and edit for clarity',
        'Proofread and finalize'
      ],
      study: [
        'Gather all study materials',
        'Review notes and highlight key concepts',
        'Create summary flashcards',
        'Practice with sample problems/questions',
        'Take a short break, then do a final review'
      ],
      prepare: [
        'List all requirements needed',
        'Gather necessary materials',
        'Set up your workspace',
        'Do a practice run-through',
        'Make final adjustments'
      ],
      create: [
        'Brainstorm ideas and concepts',
        'Sketch out initial design/plan',
        'Build the core components',
        'Add details and refinements',
        'Review and polish the final product'
      ],
      organize: [
        'Take inventory of what you have',
        'Sort items into categories',
        'Decide what to keep/remove',
        'Arrange items in their places',
        'Label and document the system'
      ],
      learn: [
        'Find quality learning resources',
        'Start with the fundamentals',
        'Take notes on key concepts',
        'Practice with hands-on exercises',
        'Review and reinforce learning'
      ],
      plan: [
        'Define your goals clearly',
        'Research options and possibilities',
        'List required steps and resources',
        'Create a timeline with milestones',
        'Review and adjust the plan'
      ],
      build: [
        'Define requirements and scope',
        'Design the architecture/structure',
        'Implement core functionality',
        'Test and debug thoroughly',
        'Document and deploy'
      ],
      clean: [
        'Clear out obvious clutter',
        'Dust and wipe surfaces',
        'Deep clean specific areas',
        'Organize items in their places',
        'Do a final walkthrough'
      ],
      email: [
        'Clarify the purpose of the email',
        'Draft the main message',
        'Review tone and clarity',
        'Proofread for errors',
        'Send and follow up if needed'
      ],
      meeting: [
        'Define the meeting agenda',
        'Prepare necessary materials',
        'Send invites with details',
        'Set up the meeting space/link',
        'Take notes and assign action items'
      ],
      project: [
        'Define project scope and goals',
        'Break down into milestones',
        'Assign tasks and deadlines',
        'Execute and track progress',
        'Review and close out'
      ]
    };

    for (const [keyword, tasks] of Object.entries(patterns)) {
      if (taskLower.includes(keyword)) {
        return tasks;
      }
    }

    return [
      'Clarify what needs to be done',
      'Gather any required resources',
      'Start with the first small step',
      'Work through the main portion',
      'Review and complete the task'
    ];
  }

  function saveTask(task) {
    chrome.storage.local.get(['tasks'], (result) => {
      const tasks = result.tasks || [];
      tasks.unshift(task);
      chrome.storage.local.set({ tasks });
    });
  }

  function loadTasks() {
    chrome.storage.local.get(['tasks'], (result) => {
      const tasks = result.tasks || [];
      const todayStr = today.toDateString();
      
      const todayTasks = tasks.filter(t => t.date === todayStr);
      
      if (todayTasks.length === 0) {
        tasksList.innerHTML = `
          <div class="empty-state">
            <span>📝</span>
            <p>No tasks for today yet.<br>Add one above to get started!</p>
          </div>
        `;
      } else {
        tasksList.innerHTML = '';
        todayTasks.forEach(task => renderTask(task));
      }
    });
  }

  function renderTask(task) {
    const emptyState = tasksList.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const taskCard = document.createElement('div');
    taskCard.className = 'task-card';
    taskCard.dataset.id = task.id;

    const subtasksHtml = task.subtasks.map(st => `<li>${st}</li>`).join('');

    taskCard.innerHTML = `
      <div class="task-header">
        <span class="task-title">${task.title}</span>
        <button class="delete-btn">Remove</button>
      </div>
      <ul class="subtasks">${subtasksHtml}</ul>
    `;

    taskCard.querySelector('.delete-btn').addEventListener('click', () => {
      deleteTask(task.id);
      taskCard.remove();
      
      if (tasksList.children.length === 0) {
        tasksList.innerHTML = `
          <div class="empty-state">
            <span>📝</span>
            <p>No tasks for today yet.<br>Add one above to get started!</p>
          </div>
        `;
      }
    });

    tasksList.prepend(taskCard);
  }

  function deleteTask(id) {
    chrome.storage.local.get(['tasks'], (result) => {
      const tasks = result.tasks || [];
      const updated = tasks.filter(t => t.id !== id);
      chrome.storage.local.set({ tasks: updated });
    });
  }
});
