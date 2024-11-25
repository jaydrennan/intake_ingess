class ChecklistManager {
    constructor() {
        this.masterTemplate = this.loadMasterTemplate();
        this.checklists = this.loadChecklists();
        this.activeChecklist = null;
        this.isEditingTemplate = false;
        this.initializeEventListeners();
        this.initializePdfJs();
    }

    async initializePdfJs() {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
        document.head.appendChild(script);

        await new Promise(resolve => script.onload = resolve);
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }

    loadMasterTemplate() {
        const stored = localStorage.getItem('masterTemplate');
        return stored ? JSON.parse(stored) : {
            sections: [
                {
                    title: 'Section 1',
                    items: [
                        { 
                            text: 'Sample item 1', 
                            checked: false,
                            pdfRefs: {
                                'packet1': { page: 1, coordinates: { x: 100, y: 100, width: 400, height: 200 } },
                                'packet2': { page: 2, coordinates: { x: 150, y: 150, width: 400, height: 200 } },
                                'packet3': { page: 1, coordinates: { x: 200, y: 200, width: 400, height: 200 } }
                            }
                        },
                        { 
                            text: 'Sample item 2', 
                            checked: false,
                            pdfRefs: {}
                        }
                    ]
                }
            ]
        };
    }

    loadChecklists() {
        const stored = localStorage.getItem('checklists');
        return stored ? JSON.parse(stored) : {};
    }

    saveData() {
        localStorage.setItem('masterTemplate', JSON.stringify(this.masterTemplate));
        localStorage.setItem('checklists', JSON.stringify(this.checklists));
    }

    createNewChecklist(name) {
        if (!name) return;
        
        const cleanTemplate = {
            sections: this.masterTemplate.sections.map(section => ({
                title: section.title,
                items: section.items.map(item => ({
                    text: item.text,
                    checked: false,
                    pdfRefs: item.pdfRefs || {}
                }))
            }))
        };
        
        this.checklists[name] = {
            name: name,
            template: cleanTemplate,
            pdfFile: null,
            pdfType: null,
            pdfUrl: null
        };
        
        this.saveData();
        this.renderChecklistList();
    }

    initializeEventListeners() {
        // New checklist button
        document.getElementById('newChecklistBtn').addEventListener('click', () => {
            document.getElementById('newChecklistModal').style.display = 'flex';
        });

        // Create checklist button in modal
        document.getElementById('createChecklistBtn').addEventListener('click', () => {
            const name = document.getElementById('newChecklistName').value;
            this.createNewChecklist(name);
            document.getElementById('newChecklistModal').style.display = 'none';
            document.getElementById('newChecklistName').value = '';
        });

        // Cancel button in modal
        document.getElementById('cancelCreateBtn').addEventListener('click', () => {
            document.getElementById('newChecklistModal').style.display = 'none';
            document.getElementById('newChecklistName').value = '';
        });

        // Edit template button
        document.getElementById('editTemplateBtn').addEventListener('click', () => {
            document.getElementById('templateModal').style.display = 'flex';
            this.renderMasterTemplate();
        });

        // Close template modal button
        document.getElementById('closeTemplateBtn').addEventListener('click', () => {
            document.getElementById('templateModal').style.display = 'none';
            this.isEditingTemplate = false;
        });

        // Toggle template editing
        document.getElementById('toggleEditTemplateBtn').addEventListener('click', () => {
            this.isEditingTemplate = !this.isEditingTemplate;
            const btn = document.getElementById('toggleEditTemplateBtn');
            btn.textContent = this.isEditingTemplate ? 'Save Template' : 'Edit Template';
            this.renderMasterTemplate();
        });

        // PDF selector
        document.getElementById('pdfSelector').addEventListener('change', (e) => {
            if (this.activeChecklist) {
                this.checklists[this.activeChecklist].pdfPackage = e.target.value;
                this.saveData();
            }
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                e.target.style.display = 'none';
                this.isEditingTemplate = false;
            }
        });
    }

    renderChecklistList() {
        const container = document.getElementById('checklistList');
        container.innerHTML = '';
        
        Object.keys(this.checklists).forEach(name => {
            const div = document.createElement('div');
            div.className = `p-4 bg-white rounded-xl shadow-sm border border-slate-200 
                           hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer
                           ${this.activeChecklist === name ? 'border-indigo-500 bg-indigo-50' : ''}`;
            div.textContent = name;
            div.addEventListener('click', () => this.loadChecklist(name));
            container.appendChild(div);
        });
    }

    renderMasterTemplate() {
        const container = document.getElementById('templateContent');
        container.innerHTML = '';

        this.masterTemplate.sections.forEach((section, sectionIndex) => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'checklist-section';

            // Section title
            const titleDiv = this.createSectionTitle(section, sectionIndex);
            sectionDiv.appendChild(titleDiv);

            // Items container
            const itemsDiv = document.createElement('div');
            itemsDiv.className = 'checklist-items';

            section.items.forEach((item, itemIndex) => {
                const itemDiv = this.createTemplateItem(item, sectionIndex, itemIndex);
                itemsDiv.appendChild(itemDiv);
            });

            if (this.isEditingTemplate) {
                const addItemBtn = this.createAddItemButton(sectionIndex);
                itemsDiv.appendChild(addItemBtn);
            }

            sectionDiv.appendChild(itemsDiv);
            container.appendChild(sectionDiv);
        });

        if (this.isEditingTemplate) {
            const addSectionBtn = this.createAddSectionButton();
            container.appendChild(addSectionBtn);
        }
    }

    createSectionTitle(section, sectionIndex) {
        const titleDiv = document.createElement('div');
        titleDiv.className = 'bg-white border border-slate-200 rounded-xl p-4 shadow-sm';
        
        if (this.isEditingTemplate) {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = section.title;
            input.className = 'flex-1 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg px-2';
            input.addEventListener('change', (e) => {
                this.masterTemplate.sections[sectionIndex].title = e.target.value;
                this.saveData();
            });
            titleDiv.appendChild(input);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×';
            deleteBtn.className = 'ml-4 bg-red-500 text-white w-8 h-8 rounded-xl hover:bg-red-600 transition-all flex items-center justify-center';
            deleteBtn.addEventListener('click', () => {
                this.masterTemplate.sections.splice(sectionIndex, 1);
                this.saveData();
                this.renderMasterTemplate();
            });
            titleDiv.appendChild(deleteBtn);
        } else {
            titleDiv.innerHTML = `<span class="text-lg font-semibold text-slate-800">${section.title}</span>`;
        }
        
        return titleDiv;
    }

    createTemplateItem(item, sectionIndex, itemIndex) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex items-center space-x-3 py-2 px-4 hover:bg-slate-50 rounded-lg transition-colors';

        if (this.isEditingTemplate) {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = item.text;
            input.className = 'flex-1 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500';
            input.addEventListener('change', (e) => {
                this.masterTemplate.sections[sectionIndex].items[itemIndex].text = e.target.value;
                this.saveData();
            });
            itemDiv.appendChild(input);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×';
            deleteBtn.className = 'bg-red-500 text-white w-6 h-6 rounded-lg hover:bg-red-600 transition-all flex items-center justify-center';
            deleteBtn.addEventListener('click', () => {
                this.masterTemplate.sections[sectionIndex].items.splice(itemIndex, 1);
                this.saveData();
                this.renderMasterTemplate();
            });
            itemDiv.appendChild(deleteBtn);
        } else {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.checked;
            checkbox.className = 'w-5 h-5 text-indigo-600 rounded-lg focus:ring-indigo-500 border-slate-300';
            checkbox.addEventListener('change', (e) => {
                if (this.activeChecklist) {
                    this.checklists[this.activeChecklist].template.sections[sectionIndex].items[itemIndex].checked = e.target.checked;
                    this.saveData();
                }
            });
            
            const label = document.createElement('span');
            label.textContent = item.text;
            label.className = 'flex-1 text-slate-700';
            
            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);
        }

        if (this.isEditingTemplate) {
            const pdfRefEditor = this.createPdfRefEditor(item, sectionIndex, itemIndex);
            itemDiv.appendChild(pdfRefEditor);
        }

        return itemDiv;
    }

    createAddItemButton(sectionIndex) {
        const btn = document.createElement('button');
        btn.textContent = '+ Add Item';
        btn.className = 'mt-3 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors';
        btn.addEventListener('click', () => {
            this.masterTemplate.sections[sectionIndex].items.push({
                text: 'New Item',
                checked: false
            });
            this.saveData();
            this.renderMasterTemplate();
        });
        return btn;
    }

    createAddSectionButton() {
        const btn = document.createElement('button');
        btn.textContent = '+ Add Section';
        btn.className = 'w-full mt-6 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors';
        btn.addEventListener('click', () => {
            this.masterTemplate.sections.push({
                title: 'New Section',
                items: []
            });
            this.saveData();
            this.renderMasterTemplate();
        });
        return btn;
    }

    async loadChecklist(name) {
        this.activeChecklist = name;
        document.getElementById('activeChecklistTitle').textContent = name;
        const checklist = this.checklists[name];
        
        // Update the main content area
        const container = document.getElementById('checklistContent');
        container.innerHTML = '';
        
        // Add PDF upload/display section
        const pdfSection = document.createElement('div');
        pdfSection.className = 'mb-8 p-6 bg-white rounded-xl shadow-sm';
        pdfSection.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h3 class="text-lg font-semibold text-slate-800">PDF Document</h3>
                    <p class="text-sm text-slate-500">Upload and manage the PDF for this checklist</p>
                </div>
                ${checklist.pdfFile ? `
                    <span class="text-sm text-slate-600">Current: ${checklist.pdfFile}</span>
                ` : ''}
            </div>
            <div class="flex gap-4 items-center">
                <input type="file" 
                       id="pdfUpload" 
                       accept="application/pdf"
                       class="hidden">
                <button id="uploadPdfBtn"
                        class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 
                               transition-all shadow-sm">
                    ${checklist.pdfFile ? 'Replace PDF' : 'Upload PDF'}
                </button>
                <select id="pdfTypeSelector" 
                        class="border border-slate-200 rounded-lg px-4 py-2 
                               focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        ${!checklist.pdfFile ? 'disabled' : ''}>
                    <option value="">Select PDF Type</option>
                    <option value="packet1" ${checklist.pdfType === 'packet1' ? 'selected' : ''}>Type 1</option>
                    <option value="packet2" ${checklist.pdfType === 'packet2' ? 'selected' : ''}>Type 2</option>
                    <option value="packet3" ${checklist.pdfType === 'packet3' ? 'selected' : ''}>Type 3</option>
                </select>
            </div>
        `;
        
        container.appendChild(pdfSection);
        
        // Add event listeners for PDF handling
        const uploadBtn = document.getElementById('uploadPdfBtn');
        const fileInput = document.getElementById('pdfUpload');
        const typeSelector = document.getElementById('pdfTypeSelector');
        
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.handlePdfUpload(e.target.files[0], name);
            }
        });
        
        typeSelector.addEventListener('change', (e) => {
            this.checklists[name].pdfType = e.target.value;
            this.saveData();
            this.loadChecklist(name);
        });

        // Render the rest of the checklist
        checklist.template.sections.forEach((section, sectionIndex) => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'mb-8 last:mb-0';
            
            // Section header
            const titleDiv = document.createElement('div');
            titleDiv.className = 'flex items-center mb-4';
            
            const titleText = document.createElement('h3');
            titleText.className = 'text-lg font-semibold text-slate-800';
            titleText.textContent = section.title;
            
            const progressContainer = document.createElement('div');
            progressContainer.className = 'ml-auto flex items-center gap-3';
            
            const checkedCount = section.items.filter(item => item.checked).length;
            const progressText = document.createElement('span');
            progressText.className = 'text-sm text-slate-500';
            progressText.textContent = `${checkedCount}/${section.items.length}`;
            
            const progressBar = document.createElement('div');
            progressBar.className = 'w-24 h-2 bg-slate-200 rounded-full overflow-hidden';
            
            const progressFill = document.createElement('div');
            progressFill.className = 'h-full bg-indigo-500 transition-all duration-300';
            progressFill.style.width = `${(checkedCount / section.items.length) * 100}%`;
            
            progressBar.appendChild(progressFill);
            progressContainer.appendChild(progressText);
            progressContainer.appendChild(progressBar);
            
            titleDiv.appendChild(titleText);
            titleDiv.appendChild(progressContainer);
            sectionDiv.appendChild(titleDiv);
            
            // Items container
            const itemsDiv = document.createElement('div');
            itemsDiv.className = 'space-y-2 ml-4';
            
            section.items.forEach(async (item, itemIndex) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = `flex items-center p-3 rounded-xl transition-all duration-200 
                                   ${item.checked ? 'bg-indigo-50' : 'hover:bg-slate-50'}`;
                
                const checkboxContainer = document.createElement('div');
                checkboxContainer.className = 'relative flex items-center';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = item.checked;
                checkbox.className = `w-5 h-5 rounded-lg border-2 border-slate-300 
                                    text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 
                                    transition-all duration-200 cursor-pointer
                                    ${item.checked ? 'border-indigo-600' : 'hover:border-indigo-400'}`;
                
                checkbox.addEventListener('change', (e) => {
                    item.checked = e.target.checked;
                    this.saveData();
                    this.loadChecklist(name); // Reload to update progress
                });
                
                const label = document.createElement('span');
                label.className = `ml-3 text-slate-700 select-none cursor-pointer
                                 ${item.checked ? 'line-through text-slate-500' : ''}`;
                label.textContent = item.text;
                
                // Make label click toggle checkbox
                label.addEventListener('click', () => {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                });
                
                itemDiv.appendChild(checkboxContainer);
                checkboxContainer.appendChild(checkbox);
                itemDiv.appendChild(label);
                
                // Add PDF preview if a package is selected
                if (checklist.pdfType) {
                    const pdfPreview = await this.createPdfPreview(item, name);
                    if (pdfPreview) {
                        itemDiv.appendChild(pdfPreview);
                    }
                }
                
                itemsDiv.appendChild(itemDiv);
            });
            
            sectionDiv.appendChild(itemsDiv);
            container.appendChild(sectionDiv);
        });
    }

    async createPdfPreview(item, checklistName) {
        const checklist = this.checklists[checklistName];
        if (!checklist.pdfUrl || !checklist.pdfType) return null;

        const previewDiv = document.createElement('div');
        previewDiv.className = 'pdf-preview mt-2 ml-8 border rounded-lg overflow-hidden';
        
        if (item.pdfRefs && item.pdfRefs[checklist.pdfType]) {
            const ref = item.pdfRefs[checklist.pdfType];
            const viewer = document.createElement('div');
            viewer.className = 'pdf-viewer bg-slate-100 p-4';
            
            const canvas = document.createElement('canvas');
            canvas.className = 'w-full h-[200px] object-contain';
            
            viewer.innerHTML = `
                <div class="bg-white rounded-lg shadow-sm p-4">
                    <div class="text-sm text-slate-500 mb-2">PDF Reference (${checklist.pdfType})</div>
                    <div class="pdf-container" style="height: 200px; background: #f8fafc;">
                        ${canvas.outerHTML}
                    </div>
                </div>
            `;
            previewDiv.appendChild(viewer);

            // Render PDF section
            try {
                const pdf = await window.pdfjsLib.getDocument(checklist.pdfUrl).promise;
                const page = await pdf.getPage(ref.page);
                
                const viewport = page.getViewport({ scale: 1.0 });
                const context = viewer.querySelector('canvas').getContext('2d');
                
                // Calculate scale to fit the section in the container
                const containerWidth = 400; // Fixed width for consistency
                const scale = containerWidth / viewport.width;
                
                const scaledViewport = page.getViewport({ scale });
                
                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;
                
                // Render the specific section of the PDF
                await page.render({
                    canvasContext: context,
                    viewport: scaledViewport,
                    transform: [
                        1, 0,
                        0, 1,
                        -ref.coordinates.x * scale, // Adjust x position
                        -ref.coordinates.y * scale  // Adjust y position
                    ]
                }).promise;

                // Crop the canvas to show only the specified section
                const croppedCanvas = document.createElement('canvas');
                const croppedContext = croppedCanvas.getContext('2d');
                
                croppedCanvas.width = ref.coordinates.width * scale;
                croppedCanvas.height = ref.coordinates.height * scale;
                
                croppedContext.drawImage(
                    canvas,
                    0, 0,
                    croppedCanvas.width, croppedCanvas.height,
                    0, 0,
                    croppedCanvas.width, croppedCanvas.height
                );
                
                // Replace the original canvas with the cropped one
                canvas.replaceWith(croppedCanvas);
                
            } catch (error) {
                console.error('Error rendering PDF:', error);
                viewer.innerHTML = `
                    <div class="bg-red-50 text-red-600 p-4 rounded-lg">
                        Error loading PDF section
                    </div>
                `;
            }
        }
        
        return previewDiv;
    }

    createPdfRefEditor(item, sectionIndex, itemIndex) {
        const editorDiv = document.createElement('div');
        editorDiv.className = 'pdf-ref-editor ml-8 mt-2';
        
        const packages = ['packet1', 'packet2', 'packet3'];
        packages.forEach(pkg => {
            const pkgDiv = document.createElement('div');
            pkgDiv.className = 'flex items-center gap-2 mb-2';
            
            const label = document.createElement('span');
            label.className = 'text-sm text-slate-600 w-24';
            label.textContent = pkg;
            
            const inputs = document.createElement('div');
            inputs.className = 'flex gap-2';
            
            const fields = [
                { name: 'page', placeholder: 'Page' },
                { name: 'x', placeholder: 'X' },
                { name: 'y', placeholder: 'Y' },
                { name: 'width', placeholder: 'Width' },
                { name: 'height', placeholder: 'Height' }
            ];
            
            fields.forEach(field => {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'w-16 px-2 py-1 border rounded';
                input.placeholder = field.placeholder;
                
                const currentRef = item.pdfRefs?.[pkg];
                if (currentRef) {
                    if (field.name === 'page') {
                        input.value = currentRef.page;
                    } else {
                        input.value = currentRef.coordinates[field.name];
                    }
                }
                
                input.addEventListener('change', () => {
                    if (!item.pdfRefs) item.pdfRefs = {};
                    if (!item.pdfRefs[pkg]) {
                        item.pdfRefs[pkg] = {
                            page: 1,
                            coordinates: { x: 0, y: 0, width: 0, height: 0 }
                        };
                    }
                    
                    if (field.name === 'page') {
                        item.pdfRefs[pkg].page = parseInt(input.value);
                    } else {
                        item.pdfRefs[pkg].coordinates[field.name] = parseInt(input.value);
                    }
                    
                    this.saveData();
                });
                
                inputs.appendChild(input);
            });
            
            pkgDiv.appendChild(label);
            pkgDiv.appendChild(inputs);
            editorDiv.appendChild(pkgDiv);
        });
        
        return editorDiv;
    }

    // Add new method to handle PDF upload
    handlePdfUpload(file, checklistName) {
        const reader = new FileReader();
        reader.onload = (e) => {
            // Store the PDF data and create an object URL
            const pdfData = e.target.result;
            const blob = new Blob([pdfData], { type: 'application/pdf' });
            const pdfUrl = URL.createObjectURL(blob);
            
            this.checklists[checklistName].pdfFile = file.name;
            this.checklists[checklistName].pdfUrl = pdfUrl;
            this.saveData();
            
            // Refresh the display
            this.loadChecklist(checklistName);
        };
        reader.readAsArrayBuffer(file);
    }
}

// Initialize the application
const app = new ChecklistManager();
app.renderChecklistList(); 