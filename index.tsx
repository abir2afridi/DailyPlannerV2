
import './index.css';

document.addEventListener('DOMContentLoaded', () => {
    const ALL_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    let currentDay = 'Mo'; // Default to Monday

    // --- DOM Element References ---
    const monthYearInput = document.getElementById('month-year') as HTMLInputElement;
    const dayToggles = document.querySelectorAll<HTMLDivElement>('.day-toggle');
    
    const scheduleInputs = document.querySelectorAll<HTMLInputElement>('.time-slot input');
    
    const waterGlasses = document.querySelectorAll<HTMLDivElement>('.water-tracker .glass');
    const waterCountEl = document.getElementById('water-count');
    
    const moodRadios = document.querySelectorAll<HTMLInputElement>('input[name="mood"]');
    const moodDescriptionEl = document.getElementById('mood-description');

    const prioritiesTextarea = document.querySelector('.top-priorities textarea') as HTMLTextAreaElement;
    const notesTextarea = document.querySelector('.notes textarea') as HTMLTextAreaElement;

    const taskInput = document.getElementById('new-task-input') as HTMLInputElement;
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('todo-list-items');

    const quoteTextEl = document.getElementById('quote-text');
    const quoteAuthorEl = document.getElementById('quote-author');

    // --- Data Persistence Layer ---

    const getInitialDayData = () => ({
        monthYear: '',
        schedule: {} as { [key: string]: string },
        water: 0,
        mood: null as string | null,
        priorities: '',
        todos: [] as { text: string, completed: boolean }[],
        notes: '',
    });

    const getFullPlannerData = (): { [key: string]: ReturnType<typeof getInitialDayData> } => {
        try {
            const data = localStorage.getItem('dailyPlannerData');
            if (data) {
                const parsedData = JSON.parse(data);
                // Ensure all days are present
                ALL_DAYS.forEach(day => {
                    if (!parsedData[day]) {
                        parsedData[day] = getInitialDayData();
                    }
                });
                return parsedData;
            }
        } catch (e) {
            console.error("Failed to parse planner data from localStorage", e);
        }
        
        const initialData: { [key: string]: ReturnType<typeof getInitialDayData> } = {};
        ALL_DAYS.forEach(day => {
            initialData[day] = getInitialDayData();
        });
        return initialData;
    };
    
    let plannerData = getFullPlannerData();

    const saveCurrentDayData = () => {
        const dayData = plannerData[currentDay];
        
        dayData.monthYear = monthYearInput.value;
        
        dayData.schedule = {};
        scheduleInputs.forEach(input => {
            const timeLabel = input.previousElementSibling?.textContent || '';
            if (timeLabel) dayData.schedule[timeLabel] = input.value;
        });

        dayData.water = document.querySelectorAll('.water-tracker .glass.filled').length;

        const selectedMood = document.querySelector<HTMLInputElement>('input[name="mood"]:checked');
        dayData.mood = selectedMood ? selectedMood.value : null;

        dayData.priorities = prioritiesTextarea.value;
        dayData.notes = notesTextarea.value;
        
        dayData.todos = [];
        taskList.querySelectorAll('li').forEach(li => {
            const span = li.querySelector('span');
            const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement;
            if (span && checkbox) {
                dayData.todos.push({ text: span.textContent || '', completed: checkbox.checked });
            }
        });

        localStorage.setItem('dailyPlannerData', JSON.stringify(plannerData));
    };


    // --- UI Rendering Functions ---

    const renderTodoList = (todos: { text: string, completed: boolean }[]) => {
        if (!taskList) return;
        taskList.innerHTML = '';
        todos.forEach((task, index) => {
            const listItem = document.createElement('li');
            if (task.completed) {
                listItem.classList.add('completed');
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => {
                listItem.classList.toggle('completed', checkbox.checked);
                saveCurrentDayData();
            });

            const textSpan = document.createElement('span');
            textSpan.textContent = task.text;

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×';
            deleteBtn.ariaLabel = 'Delete task';
            deleteBtn.addEventListener('click', () => {
                listItem.classList.add('removing');
                listItem.addEventListener('animationend', () => {
                    plannerData[currentDay].todos.splice(index, 1);
                    saveCurrentDayData();
                    renderTodoList(plannerData[currentDay].todos);
                });
            });

            listItem.appendChild(checkbox);
            listItem.appendChild(textSpan);
            listItem.appendChild(deleteBtn);
            taskList.appendChild(listItem);
        });
    };

    const loadDayData = (day: string) => {
        const dayData = plannerData[day] || getInitialDayData();

        monthYearInput.value = dayData.monthYear;

        scheduleInputs.forEach(input => {
            const timeLabel = input.previousElementSibling?.textContent || '';
            input.value = dayData.schedule[timeLabel] || '';
        });

        waterGlasses.forEach((glass, index) => {
            glass.classList.toggle('filled', index < dayData.water);
        });
        if (waterCountEl) waterCountEl.textContent = `${dayData.water} / 8 glasses`;

        moodRadios.forEach(radio => {
            radio.checked = radio.value === dayData.mood;
        });
        updateMoodDescription();

        prioritiesTextarea.value = dayData.priorities;
        notesTextarea.value = dayData.notes;

        renderTodoList(dayData.todos);
    };

    const updateMoodDescription = () => {
        const moodMap: { [key: string]: string } = {
            happy: 'Happy', smile: 'Smile', cool: 'Cool', neutral: 'Neutral',
            worried: 'Worried', angry: 'Angry', furious: 'Furious'
        };
        const selectedMood = document.querySelector<HTMLInputElement>('input[name="mood"]:checked');
        if (moodDescriptionEl) {
            moodDescriptionEl.textContent = selectedMood ? moodMap[selectedMood.value] : '\u00A0';
        }
    };


    // --- Event Listener Setup ---

    // Day of the week toggle
    dayToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const newDay = toggle.dataset.day;
            if (!newDay || newDay === currentDay) return;

            saveCurrentDayData(); // Save the state of the day we're leaving

            dayToggles.forEach(t => t.classList.remove('active', 'aria-pressed'));
            toggle.classList.add('active');
            toggle.setAttribute('aria-pressed', 'true');
            
            currentDay = newDay;
            loadDayData(currentDay);
        });
    });

    // General inputs
    [monthYearInput, prioritiesTextarea, notesTextarea, ...scheduleInputs].forEach(el => {
        el.addEventListener('input', saveCurrentDayData);
    });

    // Water tracker
    waterGlasses.forEach(glass => {
        glass.addEventListener('click', () => {
            const clickedIndex = parseInt(glass.dataset.glassIndex || '0', 10);
            const isCurrentlyFilled = glass.classList.contains('filled');
            const nextGlass = waterGlasses[clickedIndex + 1];
            
            let targetFillCount;
            if (isCurrentlyFilled && (!nextGlass || !nextGlass.classList.contains('filled'))) {
                targetFillCount = clickedIndex;
            } else {
                targetFillCount = clickedIndex + 1;
            }

            waterGlasses.forEach((g, index) => {
                g.classList.toggle('filled', index < targetFillCount);
            });

            const filledCount = document.querySelectorAll('.water-tracker .glass.filled').length;
            if (waterCountEl) waterCountEl.textContent = `${filledCount} / 8 glasses`;

            saveCurrentDayData();
        });
    });

    // Mood tracker
    moodRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            updateMoodDescription();
            saveCurrentDayData();
        });
    });

    // To-Do List add
    const addTask = () => {
        const taskText = taskInput.value.trim();
        if (taskText === '') return;
        
        plannerData[currentDay].todos.push({ text: taskText, completed: false });
        saveCurrentDayData();
        renderTodoList(plannerData[currentDay].todos);

        taskInput.value = '';
        taskInput.focus();
    };

    addTaskBtn?.addEventListener('click', addTask);
    taskInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
    
    // --- Initial Setup ---

    // Quote of the Day
    const quotes = [
        { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
        { text: "It’s not whether you get knocked down, it’s whether you get up.", author: "Vince Lombardi" },
        { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
        { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
        { text: "Well done is better than well said.", author: "Benjamin Franklin" },
    ];
    if (quoteTextEl && quoteAuthorEl) {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        quoteTextEl.textContent = `“${randomQuote.text}”`;
        quoteAuthorEl.textContent = `— ${randomQuote.author}`;
    }

    // Set initial active day toggle
    dayToggles.forEach(toggle => {
        const isDefault = toggle.dataset.day === currentDay;
        toggle.classList.toggle('active', isDefault);
        toggle.setAttribute('aria-pressed', isDefault ? 'true' : 'false');
    });

    // Load initial day data
    loadDayData(currentDay);
});
