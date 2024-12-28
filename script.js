document.addEventListener('DOMContentLoaded', function () {
    const updateForm = document.getElementById('updateForm');
    const nameInput = document.getElementById('name');
    const nameDropdown = document.getElementById('nameDropdown');
    const addInput = document.getElementById('addVal');
    const subtractInput = document.getElementById('subtractVal');
    const isNewNameCheckbox = document.getElementById('isNewName');
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');

    // Get the selected date from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const selectedDate = urlParams.get('date');

    let names = []; // Store names fetched from the server
    let activeIndex = -1; // Track the currently highlighted suggestion
    let filteredNames = []; // Store the current filtered names
    let currentHighlightedName = '';

    // Function to simplify column headers
    function simplifyHeader(header, index) {
        if (header.toLowerCase().includes('add')) return `Add ${index}`;
        if (header.toLowerCase().includes('subtract')) return `Subtract ${index}`;
        if (header.toLowerCase().includes('balance')) return `Balance ${index}`;
        return header;
    }

    // Fetch and load data
    function loadData() {
        fetch(`/get_data?date=${encodeURIComponent(selectedDate)}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Error loading data:', data.error);
                    return;
                }

                tableHead.innerHTML = '';
                tableBody.innerHTML = '';

                // Create header row
                const headerRow = document.createElement('tr');
                data.headers.forEach(header => {
                    const th = document.createElement('th');
                    th.textContent = header;
                    headerRow.appendChild(th);
                });
                tableHead.appendChild(headerRow);

                // Fill table rows
                data.data.forEach(row => {
                    const tr = document.createElement('tr');
                    data.headers.forEach(header => {
                        const td = document.createElement('td');
                        td.textContent = row[header] !== null ? row[header] : '';
                        tr.appendChild(td);
                    });
                    tableBody.appendChild(tr);
                });

                // Extract unique names for the dropdown
                names = Array.from(new Set(data.data.map(d => d['Name'] || ''))).filter(n => n);

                // Clear any existing highlights
                highlightMatchingRow('');
            })
            .catch(error => {
                console.error('Error loading data:', error);
            });
    }

    // Show matching names in the dropdown
    function showDropdown(matchedNames) {
        nameDropdown.innerHTML = ''; // Clear existing options
        activeIndex = -1; // Reset active index
        filteredNames = matchedNames; // Store current filtered names

        if (matchedNames.length === 0 || isNewNameCheckbox.checked) {
            nameDropdown.style.display = 'none';
            return;
        }

        // Sort matched names so exact matches and startsWith matches come first
        matchedNames.sort((a, b) => {
            const aLower = a.toLowerCase();
            const bLower = b.toLowerCase();
            const inputLower = nameInput.value.toLowerCase();
            
            // Exact matches first
            if (aLower === inputLower && bLower !== inputLower) return -1;
            if (bLower === inputLower && aLower !== inputLower) return 1;
            
            // Then startsWith matches
            if (aLower.startsWith(inputLower) && !bLower.startsWith(inputLower)) return -1;
            if (bLower.startsWith(inputLower) && !aLower.startsWith(inputLower)) return 1;
            
            // Finally alphabetical
            return a.localeCompare(b);
        });

        matchedNames.forEach((name, index) => {
            const div = document.createElement('div');
            div.textContent = name;
            div.classList.add('dropdown-item');
            div.addEventListener('click', function() {
                selectName(name);
            });
            nameDropdown.appendChild(div);
        });

        // Always highlight the first item in the sorted list
        if (matchedNames.length > 0) {
            activeIndex = 0;
            highlightItem(activeIndex);
            // Also highlight this name in the table
            highlightMatchingRow(matchedNames[0]);
        }
        
        nameDropdown.style.display = 'block';
    }

    // Select a name from the table
    function selectName(name) {
        nameInput.value = name;
        isNewNameCheckbox.checked = false;
        // Move focus to the add input and select its content
        addInput.focus();
        addInput.select();
    }

    // Handle keyboard navigation in the table
    nameInput.addEventListener('keydown', function(e) {
        if (isNewNameCheckbox.checked) return;
        
        if (e.key === 'Tab' || e.key === 'Enter') {
            // If we have a highlighted row, select that name
            if (currentHighlightedName) {
                e.preventDefault();
                selectName(currentHighlightedName);
            }
        }
    });

    // Update the name input event listener
    nameInput.addEventListener('input', function() {
        const filter = this.value.toLowerCase();
        
        if (isNewNameCheckbox.checked) {
            // Clear highlights if new name is checked
            highlightMatchingRow('');
            return;
        }
        
        // Highlight matching row in the table
        highlightMatchingRow(filter);
    });

    // Handle new name checkbox changes
    isNewNameCheckbox.addEventListener('change', function() {
        if (this.checked) {
            highlightMatchingRow('');
        } else if (nameInput.value) {
            highlightMatchingRow(nameInput.value);
        }
    });

    // Add focus handlers for number inputs to select content
    addInput.addEventListener('focus', function() {
        this.select();
    });

    subtractInput.addEventListener('focus', function() {
        this.select();
    });

    // Highlight a specific dropdown item
    function highlightItem(index) {
        const items = nameDropdown.querySelectorAll('.dropdown-item');
        items.forEach((item, i) => {
            if (i === index) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // Handle keyboard navigation in the dropdown
    nameInput.addEventListener('keydown', function(e) {
        if (isNewNameCheckbox.checked) return; // Skip dropdown navigation if new name is checked
        
        const items = nameDropdown.querySelectorAll('.dropdown-item');
        
        if (e.key === 'Tab') {
            // If dropdown is visible and we have filtered names
            if (nameDropdown.style.display === 'block' && filteredNames.length > 0) {
                e.preventDefault();
                
                // If we have an active item, select it
                if (activeIndex >= 0) {
                    selectName(filteredNames[activeIndex]);
                } 
                // If we have an exact match, select it
                else if (filteredNames.length === 1) {
                    selectName(filteredNames[0]);
                }
                // If we have a partial match that starts with the input
                else {
                    const partialMatch = filteredNames.find(
                        name => name.toLowerCase().startsWith(nameInput.value.toLowerCase())
                    );
                    if (partialMatch) {
                        selectName(partialMatch);
                    } else {
                        // If no exact or partial match, select the first option
                        selectName(filteredNames[0]);
                    }
                }
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (activeIndex < items.length - 1) {
                activeIndex++;
                highlightItem(activeIndex);
            } else if (activeIndex === -1 && items.length > 0) {
                // If no item is highlighted, highlight the first one
                activeIndex = 0;
                highlightItem(activeIndex);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (activeIndex > 0) {
                activeIndex--;
                highlightItem(activeIndex);
            }
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            selectName(filteredNames[activeIndex]);
        }
    });

    // Add new function to highlight and scroll to matching row
    function highlightMatchingRow(searchText) {
        if (!searchText) {
            // Remove all highlights if search is empty
            document.querySelectorAll('tr').forEach(row => {
                row.classList.remove('highlight-row', 'animating');
                row.style.transform = '';
                row.style.boxShadow = '';
            });
            currentHighlightedName = '';
            return;
        }

        const rows = Array.from(tableBody.querySelectorAll('tr'));
        let foundMatch = false;
        let matchedName = '';

        rows.forEach((row, index) => {
            const nameCell = row.cells[0];
            const name = nameCell.textContent;
            const isMatch = name.toLowerCase().includes(searchText.toLowerCase());

            if (isMatch && !foundMatch) {
                foundMatch = true;
                matchedName = name;

                // Only proceed with animation if this is a different match
                if (matchedName !== currentHighlightedName) {
                    // First: Record initial positions of all rows
                    const initialPositions = rows.map(r => r.getBoundingClientRect());
                    
                    // Remove previous highlights
                    rows.forEach(r => {
                        r.classList.remove('highlight-row', 'animating');
                        r.style.transform = '';
                        r.style.boxShadow = '';
                    });

                    // Add highlight to matched row
                    row.classList.add('highlight-row');

                    // Last: Move the matched row to the top of the tbody
                    tableBody.insertBefore(row, tableBody.firstChild);

                    // Invert: Calculate the position differences and apply transforms
                    const finalPositions = rows.map(r => r.getBoundingClientRect());
                    
                    rows.forEach((r, i) => {
                        const initial = initialPositions[i];
                        const final = finalPositions[i];
                        const deltaY = initial.top - final.top;

                        if (deltaY !== 0) {
                            // Apply the inverted transform
                            if (r === row) {
                                // For the matched row, add the lifting animation
                                r.style.transform = `translate3d(0, ${deltaY}px, 0)`;
                                r.style.setProperty('--final-y', '0px');
                                requestAnimationFrame(() => {
                                    r.style.transform = 'translate3d(0, -15px, 40px) scale(1.02)';
                                    r.style.boxShadow = '0 15px 30px rgba(102, 126, 234, 0.2)';
                                    
                                    // After a short delay, animate to final position
                                    setTimeout(() => {
                                        r.style.transform = 'translate3d(0, 0, 0) scale(1)';
                                        r.style.boxShadow = '0 5px 15px rgba(102, 126, 234, 0.1)';
                                    }, 200);
                                });
                            } else {
                                // For other rows, just slide them down
                                r.style.transform = `translateY(${deltaY}px)`;
                            }
                            // Force a reflow
                            r.offsetHeight;
                        }
                    });

                    // Play: Animate to final positions
                    requestAnimationFrame(() => {
                        rows.forEach(r => {
                            r.classList.add('animating');
                            if (r !== row) {
                                r.style.transform = '';
                            }
                        });
                    });

                    // Scroll to top smoothly
                    const tableWrapper = document.querySelector('.table-wrapper');
                    setTimeout(() => {
                        tableWrapper.scrollTo({
                            top: 0,
                            behavior: 'smooth'
                        });
                    }, 50);

                    currentHighlightedName = matchedName;
                }
            }
        });

        // If no match was found, clear the currently highlighted name
        if (!foundMatch) {
            currentHighlightedName = '';
        }
    }

    // Hide the dropdown if clicked outside
    document.addEventListener('click', function(e) {
        if (!nameInput.contains(e.target) && !nameDropdown.contains(e.target)) {
            nameDropdown.style.display = 'none';
        }
    });

    // Event listener for form submission
    if (updateForm) {
        const submitButton = updateForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;

        function showSuccessButton(newBalance) {
            // Save original button content
            const originalContent = submitButton.innerHTML;
            
            // Change button appearance
            submitButton.innerHTML = '<svg class="check-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path></svg>';
            submitButton.classList.add('success');
            
            // Create and show the balance tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'balance-tooltip';
            tooltip.textContent = `New Balance: ${newBalance}`;
            submitButton.appendChild(tooltip);

            // Reset button after animation
            setTimeout(() => {
                submitButton.innerHTML = originalContent;
                submitButton.classList.remove('success');
            }, 2000);
        }

        function capitalizeWords(str) {
            return str.trim().split(/\s+/).map(word => {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }).join(' ');
        }

        function normalizeNameForComparison(name) {
            return name.trim().toLowerCase();
        }

        function validateFullName(name) {
            const words = name.trim().split(/\s+/);
            return words.length >= 2;
        }

        updateForm.addEventListener('submit', function(event) {
            event.preventDefault();
            let nameVal = nameInput.value.trim();
            const addVal = parseFloat(addInput.value) || 0;
            const subtractVal = parseFloat(subtractInput.value) || 0;
            const gradeVal = document.getElementById('grade').value;

            // Validate name format for new names
            if (isNewNameCheckbox.checked && !validateFullName(nameVal)) {
                alert('Please enter both first and last name for new students.');
                return;
            }

            // Capitalize the name
            nameVal = capitalizeWords(nameVal);
            nameInput.value = nameVal; // Update input with capitalized name

            if (!nameVal || isNaN(addVal) || isNaN(subtractVal)) {
                alert('Please fill out all fields correctly.');
                return;
            }

            // Normalize the name and existing names for comparison
            const normalizedInputName = normalizeNameForComparison(nameVal);
            const normalizedNames = names.map(name => normalizeNameForComparison(name));

            // Check for duplicate names only when adding a new name
            if (isNewNameCheckbox.checked) {
                if (normalizedNames.includes(normalizedInputName)) {
                    alert('This name already exists in the database. Please use a different name or uncheck "New Name".');
                    return;
                }
                // Check if grade is selected for new names
                if (!gradeVal) {
                    alert('Please select a grade for the new student.');
                    return;
                }
            } else {
                // For existing names, verify the name exists
                if (!normalizedNames.includes(normalizedInputName)) {
                    const proceed = confirm('This name does not exist in the database. Would you like to mark it as a new name?');
                    if (proceed) {
                        isNewNameCheckbox.checked = true;
                        document.querySelector('.grade-group').style.display = 'block';
                        document.getElementById('grade').required = true;
                        return;
                    } else {
                        return;
                    }
                }
            }

            fetch('/update_period', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameVal,
                    date: selectedDate,
                    add: addVal,
                    subtract: subtractVal,
                    isNewName: isNewNameCheckbox.checked,
                    grade: gradeVal
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert('Error: ' + data.error);
                } else {
                    // Check if new balance is >= 1000 and trigger confetti
                    if (data.new_balance >= 1000) {
                        createConfetti();
                    }
                    
                    // Show success animation with new balance
                    showSuccessButton(data.new_balance);
                    
                    loadData(); // Reload table data
                    // Clear form
                    nameInput.value = '';
                    addInput.value = '0';
                    subtractInput.value = '0';
                    isNewNameCheckbox.checked = false;
                    document.querySelector('.grade-group').style.display = 'none';
                    document.getElementById('grade').value = '';
                    // Focus back on name input
                    nameInput.focus();
                }
            })
            .catch(err => {
                console.error('Error updating period:', err);
                alert('Error updating period.');
            });
        });
    }

    // Load data on initial page load if we're on the data entry page
    if (tableHead && tableBody) {
        loadData();
    }
});

// Add confetti animation function at the top of the file
function createConfetti() {
    const colors = ['#667eea', '#764ba2', '#63b3ed', '#48bb78', '#f6ad55'];
    const confettiCount = 150;
    const gravity = 1;
    const terminalVelocity = 5;
    const drag = 0.075;
    const confettis = [];

    class Confetti {
        constructor() {
            this.x = Math.random() * window.innerWidth;
            this.y = Math.random() * window.innerHeight * -1;
            this.rotation = Math.random() * 360;
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.size = Math.random() * (6 - 3) + 3;
            this.velocity = {
                x: Math.random() * (3 - -3) + -3,
                y: Math.random() * (-3 - -8) + -8
            };
        }

        update() {
            this.velocity.x += Math.random() * (0.1 - -0.1) + -0.1;
            this.velocity.y += gravity;
            this.velocity.y = Math.min(terminalVelocity, this.velocity.y);
            this.velocity.x *= (1 - drag);

            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.rotation += 1;
        }
    }

    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    for (let i = 0; i < confettiCount; i++) {
        confettis.push(new Confetti());
    }

    let animationFrame;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        confettis.forEach((confetti, index) => {
            confetti.update();
            ctx.save();
            ctx.translate(confetti.x, confetti.y);
            ctx.rotate(confetti.rotation * Math.PI / 180);
            ctx.fillStyle = confetti.color;
            ctx.fillRect(-confetti.size / 2, -confetti.size / 2, confetti.size, confetti.size);
            ctx.restore();

            if (confetti.y > canvas.height) {
                confettis.splice(index, 1);
            }
        });

        if (confettis.length > 0) {
            animationFrame = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(animationFrame);
            document.body.removeChild(canvas);
        }
    }

    animate();
}

// Add near the top with other event listeners
document.getElementById('isNewName').addEventListener('change', function() {
    const gradeGroup = document.querySelector('.grade-group');
    const gradeSelect = document.getElementById('grade');
    gradeGroup.style.display = this.checked ? 'block' : 'none';
    gradeSelect.required = this.checked;
});
