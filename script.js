class StorageApp {
    constructor() {
        this.dbName = 'StorageDB';
        this.dbVersion = 1;
        this.db = null;
        this.cart = [];
        this.notifications = [];
        this.alertSettings = {
            lowStock: true,
            outOfStock: true,
            newSale: true,
            document: true
        };
        
        this.init();
    }

    async init() {
        await this.initDB();
        this.setupEventListeners();
        await this.loadData();
        this.loadSavedTheme();
        this.initNotificationSystem();
        this.showNotification('Приложение Storage успешно загружено', 'info');
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                this.showNotification('Ошибка при открытии базы данных', 'error');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('warehouse')) {
                    db.createObjectStore('warehouse', { keyPath: 'id', autoIncrement: true });
                }

                if (!db.objectStoreNames.contains('suppliers')) {
                    db.createObjectStore('suppliers', { keyPath: 'id', autoIncrement: true });
                }

                if (!db.objectStoreNames.contains('sales')) {
                    db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
                }

                if (!db.objectStoreNames.contains('documents')) {
                    db.createObjectStore('documents', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    setupEventListeners() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                this.switchTab(tabName);
                
                // Refresh statistics when statistics tab is opened
                if (tabName === 'statistics') {
                    this.loadStatistics();
                }
            });
        });

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;

                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                button.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
            });
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        // Модальные окна
        document.getElementById('addProductBtn').addEventListener('click', () => {
            this.openProductModal();
        });

        document.getElementById('addSupplierBtn').addEventListener('click', () => {
            this.openSupplierModal();
        });

        document.getElementById('closeProductModal').addEventListener('click', () => {
            this.closeProductModal();
        });

        document.getElementById('closeSupplierModal').addEventListener('click', () => {
            this.closeSupplierModal();
        });

        document.getElementById('cancelProductBtn').addEventListener('click', () => {
            this.closeProductModal();
        });

        document.getElementById('cancelSupplierBtn').addEventListener('click', () => {
            this.closeSupplierModal();
        });

        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        document.getElementById('supplierForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSupplier();
        });

        document.getElementById('supplierType').addEventListener('change', (e) => {
            this.toggleSupplierFields(e.target.value);
        });

        // Search and filter functionality
        document.getElementById('productSearch').addEventListener('input', () => {
            this.filterProducts();
        });

        document.getElementById('supplierFilter').addEventListener('change', () => {
            this.filterProducts();
        });

        document.getElementById('stockFilter').addEventListener('change', () => {
            this.filterProducts();
        });

        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearProductFilters();
        });

        document.getElementById('supplierSearch').addEventListener('input', () => {
            this.filterSuppliers();
        });

        document.getElementById('supplierTypeFilter').addEventListener('change', () => {
            this.filterSuppliers();
        });

        document.getElementById('clearSupplierFilters').addEventListener('click', () => {
            this.clearSupplierFilters();
        });

        // Sales functionality
        document.getElementById('newSaleBtn').addEventListener('click', () => {
            this.startNewSale();
        });

        document.getElementById('saleProductSearch').addEventListener('input', () => {
            this.filterAvailableProducts();
        });

        document.getElementById('completeSaleBtn').addEventListener('click', () => {
            this.completeSale();
        });

        document.getElementById('clearCartBtn').addEventListener('click', () => {
            this.clearCart();
        });

        document.getElementById('refreshSalesBtn').addEventListener('click', () => {
            this.loadSalesHistory();
        });

        // Document management functionality
        document.getElementById('createDocumentBtn').addEventListener('click', () => {
            this.openDocumentModal();
        });

        document.getElementById('closeDocumentModal').addEventListener('click', () => {
            this.closeDocumentModal();
        });

        document.getElementById('cancelDocumentBtn').addEventListener('click', () => {
            this.closeDocumentModal();
        });

        document.getElementById('documentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveDocument();
        });

        document.getElementById('documentSearch').addEventListener('input', () => {
            this.filterDocuments();
        });

        document.getElementById('documentTypeFilter').addEventListener('change', () => {
            this.filterDocuments();
        });

        document.getElementById('clearDocumentFilters').addEventListener('click', () => {
            this.clearDocumentFilters();
        });

        // Settings functionality
        document.getElementById('applyThemeBtn').addEventListener('click', () => {
            this.applyTheme();
        });

        document.getElementById('clearAllDataBtn').addEventListener('click', () => {
            this.clearAllData();
        });

        // Statistics functionality
        document.getElementById('generateReportBtn').addEventListener('click', () => {
            this.generateReport();
        });

        // Backup and restore functionality
        document.getElementById('backupDataBtn').addEventListener('click', () => {
            this.backupData();
        });

        document.getElementById('restoreDataBtn').addEventListener('click', () => {
            document.getElementById('restoreFile').click();
        });

        document.getElementById('restoreFile').addEventListener('change', (e) => {
            this.restoreData(e.target.files[0]);
        });

        // Notification system functionality
        document.getElementById('clearNotificationsBtn').addEventListener('click', () => {
            this.clearNotifications();
        });

        document.getElementById('refreshNotificationsBtn').addEventListener('click', () => {
            this.loadNotifications();
        });

        document.getElementById('notificationFilter').addEventListener('change', () => {
            this.filterNotifications();
        });

        // Alert settings listeners
        document.getElementById('lowStockAlert').addEventListener('change', () => {
            this.updateAlertSettings();
        });

        document.getElementById('outOfStockAlert').addEventListener('change', () => {
            this.updateAlertSettings();
        });

        document.getElementById('newSaleAlert').addEventListener('change', () => {
            this.updateAlertSettings();
        });

        document.getElementById('documentAlert').addEventListener('change', () => {
            this.updateAlertSettings();
        });

        // Закрытие модальных окон по клику вне их
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    async importData(file) {
        if (!file) {
            this.showNotification('Файл не выбран', 'error');
            return;
        }

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            const transaction = this.db.transaction(['warehouse', 'suppliers', 'sales', 'documents'], 'readwrite');

            if (data.warehouse) {
                await this.clearStore('warehouse');
                data.warehouse.forEach(item => {
                    transaction.objectStore('warehouse').add(item);
                });
            }

            if (data.suppliers) {
                await this.clearStore('suppliers');
                data.suppliers.forEach(item => {
                    transaction.objectStore('suppliers').add(item);
                });
            }

            if (data.sales) {
                await this.clearStore('sales');
                data.sales.forEach(item => {
                    transaction.objectStore('sales').add(item);
                });
            }

            if (data.documents) {
                await this.clearStore('documents');
                data.documents.forEach(item => {
                    transaction.objectStore('documents').add(item);
                });
            }

            transaction.oncomplete = () => {
                this.showNotification('Данные успешно импортированы', 'success');
                this.loadData();
            };

            transaction.onerror = () => {
                this.showNotification('Ошибка при импорте данных', 'error');
            };

        } catch (error) {
            this.showNotification('Ошибка при чтении файла: ' + error.message, 'error');
        }
    }

    async clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async exportData() {
        try {
            const data = {
                warehouse: await this.getAllData('warehouse'),
                suppliers: await this.getAllData('suppliers'),
                sales: await this.getAllData('sales'),
                documents: await this.getAllData('documents'),
                exportDate: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `storage_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification('Данные успешно экспортированы', 'success');
        } catch (error) {
            this.showNotification('Ошибка при экспорте данных: ' + error.message, 'error');
        }
    }

    async getAllData(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    async loadData() {
        await this.loadProducts();
        await this.loadSuppliers();
        await this.loadSalesHistory();
        await this.loadAvailableProducts();
        await this.loadDocuments();
        await this.loadStatistics();
    }

    async loadProducts() {
        try {
            const products = await this.getAllData('warehouse');
            const tbody = document.getElementById('productsTableBody');
            tbody.innerHTML = '';

            if (products.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Нет товаров на складе</td></tr>';
                return;
            }

            products.forEach(product => {
                const row = document.createElement('tr');
                const stockStatus = this.getStockStatus(product.quantity);
                const stockClass = this.getStockClass(product.quantity);
                
                row.innerHTML = `
                    <td>${product.name}</td>
                    <td>${product.purchasePrice} ₽</td>
                    <td>${product.salePrice} ₽</td>
                    <td class="${stockClass}">${product.quantity} ${stockStatus}</td>
                    <td>${product.supplier || 'Не указан'}</td>
                    <td>
                        <button class="btn btn-edit" onclick="app.editProduct(${product.id})">Изменить</button>
                        <button class="btn btn-delete" onclick="app.deleteProduct(${product.id})">Удалить</button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            this.checkLowStockAlerts(products);
            await this.updateSupplierFilter();
        } catch (error) {
            this.showNotification('Ошибка при загрузке товаров', 'error');
        }
    }

    async loadSuppliers() {
        try {
            const suppliers = await this.getAllData('suppliers');
            const tbody = document.getElementById('suppliersTableBody');
            tbody.innerHTML = '';

            if (suppliers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Нет поставщиков</td></tr>';
                return;
            }

            suppliers.forEach(supplier => {
                const row = document.createElement('tr');
                const typeName = this.getSupplierTypeName(supplier.type);
                const displayName = this.getSupplierDisplayName(supplier);
                
                row.innerHTML = `
                    <td>${typeName}</td>
                    <td>${displayName}</td>
                    <td>${supplier.inn || '-'}</td>
                    <td>${supplier.ogrn || '-'}</td>
                    <td>${supplier.phone || '-'}<br>${supplier.email || '-'}</td>
                    <td>
                        <button class="btn btn-edit" onclick="app.editSupplier(${supplier.id})">Редактировать</button>
                        <button class="btn btn-delete" onclick="app.deleteSupplier(${supplier.id})">Удалить</button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            this.updateSupplierSelect(suppliers);
        } catch (error) {
            this.showNotification('Ошибка при загрузке поставщиков', 'error');
        }
    }

    updateSupplierSelect(suppliers) {
        const select = document.getElementById('productSupplier');
        select.innerHTML = '<option value="">Выберите поставщика</option>';
        
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = this.getSupplierDisplayName(supplier);
            option.textContent = this.getSupplierDisplayName(supplier);
            select.appendChild(option);
        });
    }

    getStockStatus(quantity) {
        if (quantity === 0) return '(Нет в наличии)';
        if (quantity <= 5) return '(Мало)';
        return '';
    }

    getStockClass(quantity) {
        if (quantity === 0) return 'out-of-stock';
        if (quantity <= 5) return 'low-stock';
        return 'in-stock';
    }

    checkLowStockAlerts(products) {
        const lowStockProducts = products.filter(p => p.quantity > 0 && p.quantity <= 5);
        const outOfStockProducts = products.filter(p => p.quantity === 0);

        if (outOfStockProducts.length > 0) {
            this.showNotification(`Внимание! ${outOfStockProducts.length} товаров закончились на складе`, 'error');
        }

        if (lowStockProducts.length > 0) {
            this.showNotification(`${lowStockProducts.length} товаров заканчиваются на складе`, 'info');
        }
    }

    async updateSupplierFilter() {
        try {
            const suppliers = await this.getAllData('suppliers');
            const supplierFilter = document.getElementById('supplierFilter');
            const currentValue = supplierFilter.value;
            
            supplierFilter.innerHTML = '<option value="">Все поставщики</option>';
            
            suppliers.forEach(supplier => {
                const option = document.createElement('option');
                option.value = this.getSupplierDisplayName(supplier);
                option.textContent = this.getSupplierDisplayName(supplier);
                supplierFilter.appendChild(option);
            });
            
            supplierFilter.value = currentValue;
        } catch (error) {
            console.error('Error updating supplier filter:', error);
        }
    }

    getSupplierTypeName(type) {
        const types = {
            'self_employed': 'Самозанятый',
            'individual': 'ИП',
            'company': 'ООО'
        };
        return types[type] || type;
    }

    getSupplierDisplayName(supplier) {
        switch (supplier.type) {
            case 'self_employed':
                return `${supplier.lastName} ${supplier.firstName} ${supplier.middleName || ''}`.trim();
            case 'individual':
                return supplier.name || '';
            case 'company':
                return supplier.name || '';
            default:
                return 'Неизвестный тип';
        }
    }

    openProductModal(productId = null) {
        const modal = document.getElementById('productModal');
        const form = document.getElementById('productForm');
        const title = modal.querySelector('h3');
        
        form.reset();
        this.editingProductId = productId;
        
        if (productId) {
            title.textContent = 'Редактировать товар';
            this.loadProductForEdit(productId);
        } else {
            title.textContent = 'Добавить товар';
        }
        
        modal.style.display = 'block';
    }

    async loadProductForEdit(id) {
        try {
            const products = await this.getAllData('warehouse');
            const product = products.find(p => p.id === id);
            
            if (product) {
                document.getElementById('productName').value = product.name;
                document.getElementById('purchasePrice').value = product.purchasePrice;
                document.getElementById('salePrice').value = product.salePrice;
                document.getElementById('quantity').value = product.quantity;
                document.getElementById('productSupplier').value = product.supplier || '';
            }
        } catch (error) {
            this.showNotification('Ошибка загрузки товара для редактирования', 'error');
        }
    }

    closeProductModal() {
        document.getElementById('productModal').style.display = 'none';
        this.editingProductId = null;
    }

    openSupplierModal(supplierId = null) {
        const modal = document.getElementById('supplierModal');
        const form = document.getElementById('supplierForm');
        const title = modal.querySelector('h3');
        
        form.reset();
        this.editingSupplierId = supplierId;
        
        if (supplierId) {
            title.textContent = 'Редактировать поставщика';
            this.loadSupplierForEdit(supplierId);
        } else {
            title.textContent = 'Добавить поставщика';
        }
        
        modal.style.display = 'block';
    }

    closeSupplierModal() {
        document.getElementById('supplierModal').style.display = 'none';
        this.editingSupplierId = null;
    }

    toggleSupplierFields(type) {
        const allFields = document.querySelectorAll('.supplier-fields');
        allFields.forEach(field => field.style.display = 'none');

        if (type) {
            const targetField = document.getElementById(`${type}Fields`);
            if (targetField) {
                targetField.style.display = 'block';
            }
        }
    }

    async loadSupplierForEdit(id) {
        try {
            const suppliers = await this.getAllData('suppliers');
            const supplier = suppliers.find(s => s.id === id);
            
            if (supplier) {
                document.getElementById('supplierType').value = supplier.type;
                this.toggleSupplierFields(supplier.type);
                
                switch (supplier.type) {
                    case 'self_employed':
                        document.getElementById('selfFirstName').value = supplier.firstName || '';
                        document.getElementById('selfLastName').value = supplier.lastName || '';
                        document.getElementById('selfMiddleName').value = supplier.middleName || '';
                        document.getElementById('selfInn').value = supplier.inn || '';
                        break;
                    case 'individual':
                        document.getElementById('indName').value = supplier.name || '';
                        document.getElementById('indInn').value = supplier.inn || '';
                        document.getElementById('indOgrn').value = supplier.ogrn || '';
                        break;
                    case 'company':
                        document.getElementById('compName').value = supplier.name || '';
                        document.getElementById('compInn').value = supplier.inn || '';
                        document.getElementById('compOgrn').value = supplier.ogrn || '';
                        break;
                }
                
                document.getElementById('supplierPhone').value = supplier.phone || '';
                document.getElementById('supplierEmail').value = supplier.email || '';
                document.getElementById('supplierAddress').value = supplier.address || '';
            }
        } catch (error) {
            this.showNotification('Ошибка загрузки поставщика для редактирования', 'error');
        }
    }

    async saveProduct() {
        try {
            const product = {
                name: document.getElementById('productName').value,
                purchasePrice: parseFloat(document.getElementById('purchasePrice').value),
                salePrice: parseFloat(document.getElementById('salePrice').value),
                quantity: parseInt(document.getElementById('quantity').value),
                supplier: document.getElementById('productSupplier').value,
                updatedAt: new Date().toISOString()
            };

            if (this.editingProductId) {
                await this.updateData('warehouse', this.editingProductId, product);
                this.showNotification('Товар успешно обновлен', 'success');
            } else {
                product.createdAt = new Date().toISOString();
                await this.addData('warehouse', product);
                this.showNotification('Товар успешно добавлен', 'success');
            }

            this.closeProductModal();
            await this.loadProducts();
        } catch (error) {
            this.showNotification('Ошибка при сохранении товара: ' + error.message, 'error');
        }
    }

    async saveSupplier() {
        try {
            const type = document.getElementById('supplierType').value;
            let supplier = {
                type: type,
                phone: document.getElementById('supplierPhone').value,
                email: document.getElementById('supplierEmail').value,
                address: document.getElementById('supplierAddress').value,
                updatedAt: new Date().toISOString()
            };

            switch (type) {
                case 'self_employed':
                    supplier.firstName = document.getElementById('selfFirstName').value;
                    supplier.lastName = document.getElementById('selfLastName').value;
                    supplier.middleName = document.getElementById('selfMiddleName').value;
                    supplier.inn = document.getElementById('selfInn').value;
                    break;
                case 'individual':
                    supplier.name = document.getElementById('indName').value;
                    supplier.inn = document.getElementById('indInn').value;
                    supplier.ogrn = document.getElementById('indOgrn').value;
                    break;
                case 'company':
                    supplier.name = document.getElementById('compName').value;
                    supplier.inn = document.getElementById('compInn').value;
                    supplier.ogrn = document.getElementById('compOgrn').value;
                    break;
            }

            if (this.editingSupplierId) {
                await this.updateData('suppliers', this.editingSupplierId, supplier);
                this.showNotification('Поставщик успешно обновлен', 'success');
            } else {
                supplier.createdAt = new Date().toISOString();
                await this.addData('suppliers', supplier);
                this.showNotification('Поставщик успешно добавлен', 'success');
            }

            this.closeSupplierModal();
            await this.loadSuppliers();
        } catch (error) {
            this.showNotification('Ошибка при сохранении поставщика: ' + error.message, 'error');
        }
    }

    async updateData(storeName, id, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put({ ...data, id });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async addData(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteProduct(id) {
        if (confirm('Вы уверены, что хотите удалить этот товар?')) {
            try {
                await this.deleteData('warehouse', id);
                await this.loadProducts();
                this.showNotification('Товар удален', 'success');
            } catch (error) {
                this.showNotification('Ошибка при удалении товара', 'error');
            }
        }
    }

    async deleteSupplier(id) {
        if (confirm('Вы уверены, что хотите удалить этого поставщика?')) {
            try {
                await this.deleteData('suppliers', id);
                await this.loadSuppliers();
                this.showNotification('Поставщик удален', 'success');
            } catch (error) {
                this.showNotification('Ошибка при удалении поставщика', 'error');
            }
        }
    }

    async deleteData(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    editProduct(id) {
        this.openProductModal(id);
    }

    editSupplier(id) {
        this.openSupplierModal(id);
    }

    // Search and filter methods
    filterProducts() {
        const searchTerm = document.getElementById('productSearch').value.toLowerCase();
        const supplierFilter = document.getElementById('supplierFilter').value;
        const stockFilter = document.getElementById('stockFilter').value;
        const rows = document.querySelectorAll('#productsTableBody tr');

        rows.forEach(row => {
            const productName = row.cells[0].textContent.toLowerCase();
            const supplier = row.cells[4].textContent;
            const quantityText = row.cells[3].textContent;
            const quantity = parseInt(quantityText);

            let matchesSearch = productName.includes(searchTerm);
            let matchesSupplier = !supplierFilter || supplier === supplierFilter;
            let matchesStock = true;

            if (stockFilter === 'instock') {
                matchesStock = quantity > 0;
            } else if (stockFilter === 'lowstock') {
                matchesStock = quantity > 0 && quantity <= 5;
            } else if (stockFilter === 'outofstock') {
                matchesStock = quantity === 0;
            }

            row.style.display = matchesSearch && matchesSupplier && matchesStock ? '' : 'none';
        });
    }

    clearProductFilters() {
        document.getElementById('productSearch').value = '';
        document.getElementById('supplierFilter').value = '';
        document.getElementById('stockFilter').value = '';
        this.filterProducts();
    }

    filterSuppliers() {
        const searchTerm = document.getElementById('supplierSearch').value.toLowerCase();
        const typeFilter = document.getElementById('supplierTypeFilter').value;
        const rows = document.querySelectorAll('#suppliersTableBody tr');

        rows.forEach(row => {
            const supplierName = row.cells[1].textContent.toLowerCase();
            const supplierType = row.cells[0].textContent.toLowerCase();

            let matchesSearch = supplierName.includes(searchTerm);
            let matchesType = !typeFilter || supplierType === this.getSupplierTypeText(typeFilter);

            row.style.display = matchesSearch && matchesType ? '' : 'none';
        });
    }

    clearSupplierFilters() {
        document.getElementById('supplierSearch').value = '';
        document.getElementById('supplierTypeFilter').value = '';
        this.filterSuppliers();
    }

    getSupplierTypeText(type) {
        const types = {
            'self_employed': 'Самозанятый',
            'individual': 'ИП',
            'company': 'ООО'
        };
        return types[type] || '';
    }

    // Sales management methods
    async loadAvailableProducts() {
        try {
            const products = await this.getAllData('warehouse');
            const tbody = document.getElementById('availableProductsBody');
            tbody.innerHTML = '';

            if (products.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Нет доступных товаров</td></tr>';
                return;
            }

            products.filter(product => product.quantity > 0).forEach(product => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product.name}</td>
                    <td>${product.salePrice} ₽</td>
                    <td>${product.quantity}</td>
                    <td>
                        <button class="btn btn-primary" onclick="app.addToCart(${product.id})">Добавить</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } catch (error) {
            this.showNotification('Ошибка загрузки доступных товаров', 'error');
        }
    }

    filterAvailableProducts() {
        const searchTerm = document.getElementById('saleProductSearch').value.toLowerCase();
        const rows = document.querySelectorAll('#availableProductsBody tr');

        rows.forEach(row => {
            const productName = row.cells[0].textContent.toLowerCase();
            row.style.display = productName.includes(searchTerm) ? '' : 'none';
        });
    }

    async addToCart(productId) {
        try {
            const products = await this.getAllData('warehouse');
            const product = products.find(p => p.id === productId);
            
            if (!product) {
                this.showNotification('Товар не найден', 'error');
                return;
            }

            if (product.quantity === 0) {
                this.showNotification('Товар закончился на складе', 'error');
                return;
            }

            const existingItem = this.cart.find(item => item.id === productId);
            
            if (existingItem) {
                if (existingItem.quantity >= product.quantity) {
                    this.showNotification('Недостаточно товара на складе', 'error');
                    return;
                }
                existingItem.quantity++;
            } else {
                this.cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.salePrice,
                    quantity: 1,
                    maxQuantity: product.quantity
                });
            }

            this.updateCartDisplay();
        } catch (error) {
            this.showNotification('Ошибка добавления товара в корзину', 'error');
        }
    }

    updateCartDisplay() {
        const tbody = document.getElementById('cartItemsBody');
        tbody.innerHTML = '';

        if (this.cart.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Корзина пуста</td></tr>';
            document.getElementById('totalAmount').textContent = '0.00 ₽';
            return;
        }

        let total = 0;
        this.cart.forEach(item => {
            const row = document.createElement('tr');
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            row.innerHTML = `
                <td>${item.name}</td>
                <td>
                    <input type="number" value="${item.quantity}" min="1" max="${item.maxQuantity}" 
                           onchange="app.updateCartItem(${item.id}, this.value)" 
                           style="width: 60px; padding: 2px;">
                </td>
                <td>${item.price} ₽</td>
                <td>${itemTotal.toFixed(2)} ₽</td>
                <td>
                    <button class="btn btn-delete" onclick="app.removeFromCart(${item.id})">Удалить</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        document.getElementById('totalAmount').textContent = `${total.toFixed(2)} ₽`;
    }

    updateCartItem(productId, newQuantity) {
        const quantity = parseInt(newQuantity);
        const item = this.cart.find(item => item.id === productId);
        
        if (item && quantity > 0 && quantity <= item.maxQuantity) {
            item.quantity = quantity;
            this.updateCartDisplay();
        } else {
            this.showNotification('Некорректное количество товара', 'error');
        }
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.updateCartDisplay();
    }

    clearCart() {
        this.cart = [];
        this.updateCartDisplay();
        document.getElementById('customerName').value = '';
        document.getElementById('paymentMethod').value = 'cash';
    }

    async completeSale() {
        if (this.cart.length === 0) {
            this.showNotification('Корзина пуста', 'error');
            return;
        }

        const customerName = document.getElementById('customerName').value.trim();
        const paymentMethod = document.getElementById('paymentMethod').value;

        try {
            // Update product quantities
            for (const cartItem of this.cart) {
                const products = await this.getAllData('warehouse');
                const product = products.find(p => p.id === cartItem.id);
                
                if (product) {
                    product.quantity -= cartItem.quantity;
                    await this.updateData('warehouse', cartItem.id, product);
                }
            }

            // Save sale record
            const sale = {
                customerName: customerName || 'Не указан',
                paymentMethod: paymentMethod,
                items: this.cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                })),
                totalAmount: this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                date: new Date().toISOString()
            };

            await this.addData('sales', sale);
            
            // Generate receipt
            this.generateReceipt(sale);
            
            // Clear cart and refresh displays
            this.clearCart();
            await this.loadProducts();
            await this.loadAvailableProducts();
            await this.loadSalesHistory();
            
            this.showNotification('Продажа успешно завершена', 'success');
        } catch (error) {
            this.showNotification('Ошибка при завершении продажи: ' + error.message, 'error');
        }
    }

    generateReceipt(sale) {
        const receiptContent = `
========================================
           ЧЕК РЕАЛИЗАЦИИ
========================================
Дата: ${new Date(sale.date).toLocaleString('ru-RU')}
Покупатель: ${sale.customerName}
Способ оплаты: ${this.getPaymentMethodText(sale.paymentMethod)}
========================================
ТОВАРЫ:
${sale.items.map(item => 
    `${item.name} x${item.quantity} = ${(item.price * item.quantity).toFixed(2)} ₽`
).join('\n')}
========================================
ИТОГО: ${sale.totalAmount.toFixed(2)} ₽
========================================
Спасибо за покупку!
        `.trim();

        const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt_${sale.date.replace(/[:.]/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    getPaymentMethodText(method) {
        const methods = {
            'cash': 'Наличные',
            'card': 'Карта',
            'transfer': 'Перевод'
        };
        return methods[method] || method;
    }

    async loadSalesHistory() {
        try {
            const sales = await this.getAllData('sales');
            const tbody = document.getElementById('salesHistoryBody');
            tbody.innerHTML = '';

            if (sales.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Нет продаж</td></tr>';
                return;
            }

            // Sort by date (newest first)
            sales.sort((a, b) => new Date(b.date) - new Date(a.date));

            sales.forEach(sale => {
                const row = document.createElement('tr');
                const itemsList = sale.items.map(item => `${item.name} x${item.quantity}`).join(', ');
                
                row.innerHTML = `
                    <td>${new Date(sale.date).toLocaleDateString('ru-RU')}</td>
                    <td>${sale.customerName}</td>
                    <td>${itemsList}</td>
                    <td>${sale.totalAmount.toFixed(2)} ₽</td>
                    <td>${this.getPaymentMethodText(sale.paymentMethod)}</td>
                    <td>
                        <button class="btn btn-primary" onclick="app.printReceipt('${sale.id}')">Чек</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } catch (error) {
            this.showNotification('Ошибка загрузки истории продаж', 'error');
        }
    }

    async printReceipt(saleId) {
        try {
            const sales = await this.getAllData('sales');
            const sale = sales.find(s => s.id == saleId);
            
            if (sale) {
                this.generateReceipt(sale);
            }
        } catch (error) {
            this.showNotification('Ошибка печати чека', 'error');
        }
    }

    startNewSale() {
        this.clearCart();
        document.getElementById('saleProductSearch').value = '';
        this.filterAvailableProducts();
    }

    // Document management methods
    async loadDocuments() {
        try {
            const documents = await this.getAllData('documents');
            const tbody = document.getElementById('documentsTableBody');
            tbody.innerHTML = '';

            if (documents.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Нет документов</td></tr>';
                return;
            }

            // Sort by date (newest first)
            documents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            documents.forEach(document => {
                const row = document.createElement('tr');
                const statusClass = `status-${document.status}`;
                
                row.innerHTML = `
                    <td>${document.title}</td>
                    <td>${this.getDocumentTypeText(document.type)}</td>
                    <td>${new Date(document.createdAt).toLocaleDateString('ru-RU')}</td>
                    <td class="${statusClass}">${this.getDocumentStatusText(document.status)}</td>
                    <td>
                        <button class="btn btn-primary" onclick="app.viewDocument(${document.id})">Просмотр</button>
                        <button class="btn btn-edit" onclick="app.editDocument(${document.id})">Изменить</button>
                        <button class="btn btn-delete" onclick="app.deleteDocument(${document.id})">Удалить</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } catch (error) {
            this.showNotification('Ошибка загрузки документов', 'error');
        }
    }

    getDocumentTypeText(type) {
        const types = {
            'invoice': 'Счет-фактура',
            'act': 'Акт выполненных работ',
            'contract': 'Договор',
            'report': 'Отчет'
        };
        return types[type] || type;
    }

    getDocumentStatusText(status) {
        const statuses = {
            'draft': 'Черновик',
            'sent': 'Отправлен',
            'signed': 'Подписан',
            'archived': 'Архивирован'
        };
        return statuses[status] || status;
    }

    createDocument(type) {
        this.openDocumentModal(null, type);
    }

    openDocumentModal(documentId = null, type = null) {
        const modal = document.getElementById('documentModal');
        const form = document.getElementById('documentForm');
        const title = modal.querySelector('h3');
        
        form.reset();
        this.editingDocumentId = documentId;
        
        if (documentId) {
            title.textContent = 'Редактировать документ';
            this.loadDocumentForEdit(documentId);
        } else {
            title.textContent = 'Создать документ';
            if (type) {
                document.getElementById('documentType').value = type;
            }
        }
        
        modal.style.display = 'block';
    }

    closeDocumentModal() {
        document.getElementById('documentModal').style.display = 'none';
        this.editingDocumentId = null;
    }

    async loadDocumentForEdit(id) {
        try {
            const documents = await this.getAllData('documents');
            const document = documents.find(d => d.id === id);
            
            if (document) {
                document.getElementById('documentTitle').value = document.title;
                document.getElementById('documentType').value = document.type;
                document.getElementById('documentContent').value = document.content;
                document.getElementById('documentRecipient').value = document.recipient || '';
                document.getElementById('documentStatus').value = document.status;
            }
        } catch (error) {
            this.showNotification('Ошибка загрузки документа для редактирования', 'error');
        }
    }

    async saveDocument() {
        try {
            const document = {
                title: document.getElementById('documentTitle').value,
                type: document.getElementById('documentType').value,
                content: document.getElementById('documentContent').value,
                recipient: document.getElementById('documentRecipient').value,
                status: document.getElementById('documentStatus').value,
                updatedAt: new Date().toISOString()
            };

            if (this.editingDocumentId) {
                await this.updateData('documents', this.editingDocumentId, document);
                this.showNotification('Документ успешно обновлен', 'success');
            } else {
                document.createdAt = new Date().toISOString();
                await this.addData('documents', document);
                this.showNotification('Документ успешно создан', 'success');
            }

            this.closeDocumentModal();
            await this.loadDocuments();
        } catch (error) {
            this.showNotification('Ошибка при сохранении документа: ' + error.message, 'error');
        }
    }

    async deleteDocument(id) {
        if (confirm('Вы уверены, что хотите удалить этот документ?')) {
            try {
                await this.deleteData('documents', id);
                await this.loadDocuments();
                this.showNotification('Документ удален', 'success');
            } catch (error) {
                this.showNotification('Ошибка при удалении документа', 'error');
            }
        }
    }

    async viewDocument(id) {
        try {
            const documents = await this.getAllData('documents');
            const document = documents.find(d => d.id === id);
            
            if (document) {
                this.generateDocumentFile(document);
            }
        } catch (error) {
            this.showNotification('Ошибка просмотра документа', 'error');
        }
    }

    editDocument(id) {
        this.openDocumentModal(id);
    }

    generateDocumentFile(document) {
        const content = `
========================================
${this.getDocumentTypeText(document.type).toUpperCase()}
========================================
Название: ${document.title}
Дата создания: ${new Date(document.createdAt).toLocaleString('ru-RU')}
Статус: ${this.getDocumentStatusText(document.status)}
Получатель: ${document.recipient || 'Не указан'}
========================================
СОДЕРЖАНИЕ:
${document.content}
========================================
        `.trim();

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${document.title.replace(/[^a-zA-Z0-9а-яА-Я]/g, '_')}_${document.createdAt.split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    filterDocuments() {
        const searchTerm = document.getElementById('documentSearch').value.toLowerCase();
        const typeFilter = document.getElementById('documentTypeFilter').value;
        const rows = document.querySelectorAll('#documentsTableBody tr');

        rows.forEach(row => {
            const title = row.cells[0].textContent.toLowerCase();
            const type = row.cells[1].textContent.toLowerCase();

            let matchesSearch = title.includes(searchTerm);
            let matchesType = !typeFilter || type === this.getDocumentTypeText(typeFilter);

            row.style.display = matchesSearch && matchesType ? '' : 'none';
        });
    }

    clearDocumentFilters() {
        document.getElementById('documentSearch').value = '';
        document.getElementById('documentTypeFilter').value = '';
        this.filterDocuments();
    }

    // Theme management methods
    loadSavedTheme() {
        const savedTheme = localStorage.getItem('storage-theme') || 'windows95';
        document.getElementById('themeSelect').value = savedTheme;
        this.applyTheme(savedTheme);
    }

    applyTheme(themeName = null) {
        const theme = themeName || document.getElementById('themeSelect').value;
        const body = document.body;
        
        // Remove all theme classes
        body.classList.remove('modern');
        
        if (theme === 'modern') {
            body.classList.add('modern');
        }
        
        // Save theme preference
        localStorage.setItem('storage-theme', theme);
        
        this.showNotification(`Тема "${theme === 'modern' ? 'Минимализм' : 'Windows 95 Классика'}" применена`, 'success');
    }

    async clearAllData() {
        if (confirm('Вы уверены, что хотите удалить все данные? Это действие необратимо и удалит все товары, поставщиков, продажи и документы!')) {
            try {
                // Clear all object stores
                const stores = ['warehouse', 'suppliers', 'sales', 'documents'];
                
                for (const store of stores) {
                    const allData = await this.getAllData(store);
                    for (const item of allData) {
                        await this.deleteData(store, item.id);
                    }
                }
                
                // Reload all data
                await this.loadData();
                
                this.showNotification('Все данные успешно удалены', 'success');
            } catch (error) {
                this.showNotification('Ошибка при удалении данных: ' + error.message, 'error');
            }
        }
    }

    // Statistics and reporting methods
    async loadStatistics() {
        try {
            await this.updateOverviewCards();
            await this.updateDetailedStats();
            await this.drawCharts();
        } catch (error) {
            this.showNotification('Ошибка загрузки статистики', 'error');
        }
    }

    async updateOverviewCards() {
        try {
            const products = await this.getAllData('warehouse');
            const sales = await this.getAllData('sales');
            const suppliers = await this.getAllData('suppliers');

            // Calculate total value
            const totalValue = products.reduce((sum, product) => {
                return sum + (product.quantity * product.salePrice);
            }, 0);

            // Count low stock items
            const lowStock = products.filter(product => product.quantity > 0 && product.quantity <= 5).length;

            // Calculate monthly sales
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlySales = sales
                .filter(sale => {
                    const saleDate = new Date(sale.date);
                    return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
                })
                .reduce((sum, sale) => sum + sale.totalAmount, 0);

            // Update UI
            document.getElementById('totalValue').textContent = `${totalValue.toFixed(2)} ₽`;
            document.getElementById('totalProducts').textContent = products.length;
            document.getElementById('monthlySales').textContent = `${monthlySales.toFixed(2)} ₽`;
            document.getElementById('lowStock').textContent = lowStock;
        } catch (error) {
            console.error('Error updating overview cards:', error);
        }
    }

    async updateDetailedStats() {
        try {
            const products = await this.getAllData('warehouse');
            const sales = await this.getAllData('sales');
            const suppliers = await this.getAllData('suppliers');

            // Product statistics
            const inStock = products.filter(p => p.quantity > 0).length;
            const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= 5).length;
            const outOfStock = products.filter(p => p.quantity === 0).length;

            document.getElementById('statTotalProducts').textContent = products.length;
            document.getElementById('statInStock').textContent = inStock;
            document.getElementById('statLowStock').textContent = lowStock;
            document.getElementById('statOutOfStock').textContent = outOfStock;

            // Sales statistics
            const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
            const averageSale = sales.length > 0 ? totalRevenue / sales.length : 0;
            const today = new Date().toDateString();
            const todaySales = sales.filter(sale => new Date(sale.date).toDateString() === today).length;

            document.getElementById('statTotalSales').textContent = sales.length;
            document.getElementById('statTotalRevenue').textContent = `${totalRevenue.toFixed(2)} ₽`;
            document.getElementById('statAverageSale').textContent = `${averageSale.toFixed(2)} ₽`;
            document.getElementById('statTodaySales').textContent = todaySales;

            // Supplier statistics
            const selfEmployed = suppliers.filter(s => s.type === 'self_employed').length;
            const individual = suppliers.filter(s => s.type === 'individual').length;
            const company = suppliers.filter(s => s.type === 'company').length;

            document.getElementById('statTotalSuppliers').textContent = suppliers.length;
            document.getElementById('statActiveSuppliers').textContent = suppliers.length; // All suppliers are considered active
            document.getElementById('statSelfEmployed').textContent = selfEmployed;
            document.getElementById('statIndividual').textContent = individual;
        } catch (error) {
            console.error('Error updating detailed stats:', error);
        }
    }

    async drawCharts() {
        await this.drawSalesChart();
        await this.drawTopProductsChart();
    }

    async drawSalesChart() {
        try {
            const canvas = document.getElementById('salesChart');
            const ctx = canvas.getContext('2d');
            const sales = await this.getAllData('sales');

            // Prepare data for last 7 days
            const last7Days = [];
            const salesData = [];
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateString = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                
                const daySales = sales.filter(sale => 
                    new Date(sale.date).toDateString() === date.toDateString()
                ).reduce((sum, sale) => sum + sale.totalAmount, 0);
                
                last7Days.push(dateString);
                salesData.push(daySales);
            }

            // Simple bar chart
            const maxValue = Math.max(...salesData, 1);
            const barWidth = canvas.width / (last7Days.length * 2);
            const chartHeight = canvas.height - 40;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw bars
            salesData.forEach((value, index) => {
                const barHeight = (value / maxValue) * chartHeight;
                const x = index * barWidth * 2 + barWidth / 2;
                const y = canvas.height - barHeight - 20;
                
                ctx.fillStyle = '#667eea';
                ctx.fillRect(x, y, barWidth, barHeight);
                
                // Draw value on top
                ctx.fillStyle = '#000000';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`${value.toFixed(0)} ₽`, x + barWidth / 2, y - 5);
                
                // Draw date label
                ctx.fillText(last7Days[index], x + barWidth / 2, canvas.height - 5);
            });
        } catch (error) {
            console.error('Error drawing sales chart:', error);
        }
    }

    async drawTopProductsChart() {
        try {
            const canvas = document.getElementById('topProductsChart');
            const ctx = canvas.getContext('2d');
            const sales = await this.getAllData('sales');

            // Calculate top products by sales
            const productSales = {};
            
            sales.forEach(sale => {
                sale.items.forEach(item => {
                    if (!productSales[item.name]) {
                        productSales[item.name] = 0;
                    }
                    productSales[item.name] += item.quantity;
                });
            });

            // Get top 5 products
            const topProducts = Object.entries(productSales)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            if (topProducts.length === 0) {
                ctx.fillStyle = '#000000';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Нет данных о продажах', canvas.width / 2, canvas.height / 2);
                return;
            }

            // Draw horizontal bar chart
            const maxQuantity = Math.max(...topProducts.map(p => p[1]));
            const barHeight = 25;
            const startY = 20;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            topProducts.forEach((product, index) => {
                const [name, quantity] = product;
                const barWidth = (quantity / maxQuantity) * (canvas.width - 100);
                const y = startY + index * (barHeight + 10);

                // Draw bar
                ctx.fillStyle = '#667eea';
                ctx.fillRect(10, y, barWidth, barHeight);

                // Draw product name
                ctx.fillStyle = '#000000';
                ctx.font = '10px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(name, barWidth + 20, y + barHeight / 2 + 3);

                // Draw quantity
                ctx.textAlign = 'right';
                ctx.fillText(`${quantity} шт.`, barWidth + 15, y + barHeight / 2 + 3);
            });
        } catch (error) {
            console.error('Error drawing top products chart:', error);
        }
    }

    async generateReport(type = 'comprehensive') {
        try {
            const products = await this.getAllData('warehouse');
            const sales = await this.getAllData('sales');
            const suppliers = await this.getAllData('suppliers');

            let reportContent = '';
            const date = new Date().toLocaleString('ru-RU');

            switch (type) {
                case 'inventory':
                    reportContent = this.generateInventoryReport(products, date);
                    break;
                case 'sales':
                    reportContent = this.generateSalesReport(sales, date);
                    break;
                case 'suppliers':
                    reportContent = this.generateSuppliersReport(suppliers, date);
                    break;
                case 'financial':
                    reportContent = this.generateFinancialReport(products, sales, date);
                    break;
                default:
                    reportContent = this.generateComprehensiveReport(products, sales, suppliers, date);
            }

            this.downloadReport(reportContent, `report_${type}_${date.replace(/[:.]/g, '-')}.txt`);
            this.showNotification('Отчет успешно сгенерирован', 'success');
        } catch (error) {
            this.showNotification('Ошибка при генерации отчета: ' + error.message, 'error');
        }
    }

    generateInventoryReport(products, date) {
        const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.salePrice), 0);
        const inStock = products.filter(p => p.quantity > 0).length;
        const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= 5).length;
        const outOfStock = products.filter(p => p.quantity === 0).length;

        return `
========================================
ОТЧЕТ ПО СКЛАДУ
========================================
Дата: ${date}

ОБЩАЯ СТАТИСТИКА:
- Всего товаров: ${products.length}
- Общая стоимость: ${totalValue.toFixed(2)} ₽
- В наличии: ${inStock}
- Мало на складе: ${lowStock}
- Нет в наличии: ${outOfStock}

ДЕТАЛЬНЫЙ СПИСОК ТОВАРОВ:
${products.map(p => 
    `${p.name} - ${p.quantity} шт. - ${p.salePrice} ₽/шт. - ${(p.quantity * p.salePrice).toFixed(2)} ₽`
).join('\n')}
========================================
        `.trim();
    }

    generateSalesReport(sales, date) {
        const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const averageSale = sales.length > 0 ? totalRevenue / sales.length : 0;

        return `
========================================
ОТЧЕТ ПО ПРОДАЖАМ
========================================
Дата: ${date}

ОБЩАЯ СТАТИСТИКА:
- Всего продаж: ${sales.length}
- Общая выручка: ${totalRevenue.toFixed(2)} ₽
- Средний чек: ${averageSale.toFixed(2)} ₽

ПОСЛЕДНИЕ ПРОДАЖИ:
${sales.slice(-10).reverse().map(s => 
    `${new Date(s.date).toLocaleDateString('ru-RU')} - ${s.customerName} - ${s.totalAmount.toFixed(2)} ₽`
).join('\n')}
========================================
        `.trim();
    }

    generateSuppliersReport(suppliers, date) {
        const selfEmployed = suppliers.filter(s => s.type === 'self_employed').length;
        const individual = suppliers.filter(s => s.type === 'individual').length;
        const company = suppliers.filter(s => s.type === 'company').length;

        return `
========================================
ОТЧЕТ ПО ПОСТАВЩИКАМ
========================================
Дата: ${date}

ОБЩАЯ СТАТИСТИКА:
- Всего поставщиков: ${suppliers.length}
- Самозанятые: ${selfEmployed}
- ИП: ${individual}
- ООО: ${company}

СПИСОК ПОСТАВЩИКОВ:
${suppliers.map(s => 
    `${s.name} - ${this.getSupplierTypeText(s.type)} - ${s.phone}`
).join('\n')}
========================================
        `.trim();
    }

    generateFinancialReport(products, sales, date) {
        const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.salePrice), 0);
        const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyRevenue = sales
            .filter(s => {
                const saleDate = new Date(s.date);
                return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
            })
            .reduce((sum, s) => sum + s.totalAmount, 0);

        return `
========================================
ФИНАНСОВЫЙ ОТЧЕТ
========================================
Дата: ${date}

АКТИВЫ:
- Стоимость товаров на складе: ${totalValue.toFixed(2)} ₽

ДОХОДЫ:
- Общая выручка: ${totalRevenue.toFixed(2)} ₽
- Выручка за текущий месяц: ${monthlyRevenue.toFixed(2)} ₽

ПОКАЗАТЕЛИ:
- Количество продаж: ${sales.length}
- Средний чек: ${sales.length > 0 ? (totalRevenue / sales.length).toFixed(2) : 0} ₽
========================================
        `.trim();
    }

    generateComprehensiveReport(products, sales, suppliers, date) {
        return `
========================================
КОМПЛЕКСНЫЙ ОТЧЕТ
========================================
Дата: ${date}

СКЛАД:
- Всего товаров: ${products.length}
- Общая стоимость: ${products.reduce((sum, p) => sum + (p.quantity * p.salePrice), 0).toFixed(2)} ₽

ПРОДАЖИ:
- Всего продаж: ${sales.length}
- Общая выручка: ${sales.reduce((sum, s) => sum + s.totalAmount, 0).toFixed(2)} ₽

ПОСТАВЩИКИ:
- Всего поставщиков: ${suppliers.length}

========================================
        `.trim();
    }

    downloadReport(content, filename) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Backup and restore methods
    async backupData() {
        try {
            const backupData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                data: {
                    products: await this.getAllData('warehouse'),
                    suppliers: await this.getAllData('suppliers'),
                    sales: await this.getAllData('sales'),
                    documents: await this.getAllData('documents')
                }
            };

            const backupJson = JSON.stringify(backupData, null, 2);
            const filename = `storage_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            
            this.downloadReport(backupJson, filename);
            this.showNotification('Резервная копия успешно создана', 'success');
        } catch (error) {
            this.showNotification('Ошибка при создании резервной копии: ' + error.message, 'error');
        }
    }

    async restoreData(file) {
        if (!file) {
            this.showNotification('Файл не выбран', 'error');
            return;
        }

        try {
            const text = await file.text();
            const backupData = JSON.parse(text);

            // Validate backup structure
            if (!backupData.data || !backupData.data.products || !backupData.data.suppliers || !backupData.data.sales || !backupData.data.documents) {
                throw new Error('Неверный формат файла резервной копии');
            }

            // Clear existing data
            await this.clearAllDataInternal();

            // Restore data
            for (const product of backupData.data.products) {
                await this.addData('warehouse', product);
            }

            for (const supplier of backupData.data.suppliers) {
                await this.addData('suppliers', supplier);
            }

            for (const sale of backupData.data.sales) {
                await this.addData('sales', sale);
            }

            for (const document of backupData.data.documents) {
                await this.addData('documents', document);
            }

            // Reload all data
            await this.loadData();

            this.showNotification('Данные успешно восстановлены из резервной копии', 'success');
        } catch (error) {
            this.showNotification('Ошибка при восстановлении данных: ' + error.message, 'error');
        }
    }

    async clearAllDataInternal() {
        // Clear all object stores without confirmation
        const stores = ['warehouse', 'suppliers', 'sales', 'documents'];
        
        for (const store of stores) {
            const allData = await this.getAllData(store);
            for (const item of allData) {
                await this.deleteData(store, item.id);
            }
        }
    }

    // Notification System Methods
    initNotificationSystem() {
        this.loadAlertSettings();
        this.loadNotifications();
        this.updateSystemStatus();
        
        // Start periodic checks
        setInterval(() => {
            this.checkAlerts();
        }, 30000); // Check every 30 seconds
    }

    loadAlertSettings() {
        const saved = localStorage.getItem('alertSettings');
        if (saved) {
            this.alertSettings = JSON.parse(saved);
            this.updateAlertSettingsUI();
        }
    }

    updateAlertSettingsUI() {
        document.getElementById('lowStockAlert').checked = this.alertSettings.lowStock;
        document.getElementById('outOfStockAlert').checked = this.alertSettings.outOfStock;
        document.getElementById('newSaleAlert').checked = this.alertSettings.newSale;
        document.getElementById('documentAlert').checked = this.alertSettings.document;
    }

    updateAlertSettings() {
        this.alertSettings = {
            lowStock: document.getElementById('lowStockAlert').checked,
            outOfStock: document.getElementById('outOfStockAlert').checked,
            newSale: document.getElementById('newSaleAlert').checked,
            document: document.getElementById('documentAlert').checked
        };
        
        localStorage.setItem('alertSettings', JSON.stringify(this.alertSettings));
        this.showNotification('Настройки оповещений обновлены', 'success');
    }

    addNotification(title, message, type = 'info', data = null) {
        const notification = {
            id: Date.now(),
            title,
            message,
            type,
            timestamp: new Date().toISOString(),
            data
        };
        
        this.notifications.unshift(notification);
        
        // Keep only last 100 notifications
        if (this.notifications.length > 100) {
            this.notifications = this.notifications.slice(0, 100);
        }
        
        this.updateNotificationsList();
        this.updateSystemStatus();
    }

    loadNotifications() {
        const saved = localStorage.getItem('notifications');
        if (saved) {
            this.notifications = JSON.parse(saved);
            this.updateNotificationsList();
        }
    }

    saveNotifications() {
        localStorage.setItem('notifications', JSON.stringify(this.notifications));
    }

    updateNotificationsList() {
        const container = document.getElementById('notificationsList');
        const filter = document.getElementById('notificationFilter').value;
        
        let filteredNotifications = this.notifications;
        if (filter !== 'all') {
            filteredNotifications = this.notifications.filter(n => n.type === filter);
        }
        
        container.innerHTML = '';
        
        if (filteredNotifications.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет уведомлений</div>';
            return;
        }
        
        filteredNotifications.forEach(notification => {
            const item = document.createElement('div');
            item.className = `notification-item ${notification.type}`;
            
            const icon = this.getNotificationIcon(notification.type);
            const time = new Date(notification.timestamp).toLocaleString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                day: 'numeric',
                month: 'short'
            });
            
            item.innerHTML = `
                <div class="notification-icon">${icon}</div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${time}</div>
                </div>
            `;
            
            container.appendChild(item);
        });
        
        this.saveNotifications();
    }

    getNotificationIcon(type) {
        const icons = {
            'warning': '⚠️',
            'error': '❌',
            'success': '✅',
            'info': 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    clearNotifications() {
        if (confirm('Вы уверены, что хотите очистить все уведомления?')) {
            this.notifications = [];
            this.updateNotificationsList();
            this.updateSystemStatus();
            this.showNotification('Все уведомления очищены', 'success');
        }
    }

    filterNotifications() {
        this.updateNotificationsList();
    }

    async checkAlerts() {
        try {
            await this.checkLowStockAlerts();
            await this.checkOutOfStockAlerts();
            this.updateSystemStatus();
        } catch (error) {
            console.error('Error checking alerts:', error);
        }
    }

    async checkLowStockAlerts() {
        if (!this.alertSettings.lowStock) return;
        
        const products = await this.getAllData('warehouse');
        const lowStockProducts = products.filter(p => p.quantity > 0 && p.quantity <= 5);
        
        lowStockProducts.forEach(product => {
            const existingNotification = this.notifications.find(n => 
                n.type === 'warning' && 
                n.data && 
                n.data.type === 'lowStock' && 
                n.data.productId === product.id
            );
            
            if (!existingNotification) {
                this.addNotification(
                    'Низкий запас товара',
                    `Товар "${product.name}" имеет низкий запас: ${product.quantity} шт.`,
                    'warning',
                    { type: 'lowStock', productId: product.id }
                );
            }
        });
    }

    async checkOutOfStockAlerts() {
        if (!this.alertSettings.outOfStock) return;
        
        const products = await this.getAllData('warehouse');
        const outOfStockProducts = products.filter(p => p.quantity === 0);
        
        outOfStockProducts.forEach(product => {
            const existingNotification = this.notifications.find(n => 
                n.type === 'error' && 
                n.data && 
                n.data.type === 'outOfStock' && 
                n.data.productId === product.id
            );
            
            if (!existingNotification) {
                this.addNotification(
                    'Товар закончился',
                    `Товар "${product.name}" отсутствует на складе.`,
                    'error',
                    { type: 'outOfStock', productId: product.id }
                );
            }
        });
    }

    updateSystemStatus() {
        // Update database status
        document.getElementById('dbStatus').textContent = this.db ? 'Активна' : 'Неактивна';
        document.getElementById('dbStatus').className = this.db ? 'status-value active' : 'status-value inactive';
        
        // Update last save time
        const lastSave = localStorage.getItem('lastSaveTime');
        if (lastSave) {
            const time = new Date(lastSave).toLocaleString('ru-RU');
            document.getElementById('lastSave').textContent = time;
        }
        
        // Update active alerts count
        const activeAlerts = this.notifications.filter(n => 
            n.type === 'warning' || n.type === 'error'
        ).length;
        document.getElementById('activeAlerts').textContent = activeAlerts;
        
        // Estimate database size
        this.estimateDatabaseSize();
    }

    async estimateDatabaseSize() {
        try {
            let totalSize = 0;
            const stores = ['warehouse', 'suppliers', 'sales', 'documents'];
            
            for (const store of stores) {
                const data = await this.getAllData(store);
                totalSize += JSON.stringify(data).length;
            }
            
            const sizeInKB = (totalSize / 1024).toFixed(2);
            document.getElementById('dbSize').textContent = `${sizeInKB} КБ`;
        } catch (error) {
            document.getElementById('dbSize').textContent = 'Ошибка';
        }
    }

    // Override showNotification to also add to notification system
    showNotification(message, type = 'info') {
        // Call original notification display
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
        
        // Add to notification system
        this.addNotification('Системное уведомление', message, type);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new StorageApp();
});
