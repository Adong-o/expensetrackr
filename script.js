class ExpenseTracker {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.budget = parseFloat(localStorage.getItem('budget')) || 0;
        this.initializeElements();
        this.setupEventListeners();
        this.setupBudgetModal();
        this.updateUI();
        this.setupExportButtons();
    }

    initializeElements() {
        this.form = document.getElementById('transaction-form');
        this.totalBalance = document.getElementById('total-balance');
        this.expenseTotal = document.getElementById('expense-total');
        this.transactionsBody = document.getElementById('transactions-body');
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Add analytics view toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => this.toggleAnalyticsView(btn));
        });

        // Add sidebar navigation
        document.querySelectorAll('.sidebar li').forEach(item => {
            item.addEventListener('click', () => this.handleNavigation(item));
        });
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const transaction = {
            id: Date.now(),
            description: document.getElementById('description').value,
            amount: parseFloat(document.getElementById('amount').value)
        };

        this.transactions.push(transaction);
        this.saveToLocalStorage();
        this.updateUI();
        this.form.reset();

        this.showNotification('Expense added successfully!');

        const analyticsView = document.getElementById('analytics-view');
        if (analyticsView.style.display === 'block') {
            this.updateAnalytics();
        }
    }

    updateUI() {
        const totalExpenses = this.getTotalExpenses();
        const remaining = this.budget - totalExpenses;

        this.totalBalance.textContent = `$${remaining.toFixed(2)}`;
        this.expenseTotal.textContent = `$${totalExpenses.toFixed(2)}`;

        // Update expense percentage
        if(this.budget > 0) {
            document.getElementById('expense-percent').innerHTML = 
                `<i class="fas fa-chart-pie"></i> ${((totalExpenses / this.budget) * 100).toFixed(1)}% of budget`;
        }

        this.renderTransactions();
        
        const analyticsView = document.getElementById('analytics-view');
        if (analyticsView.style.display === 'block') {
            this.updateAnalytics();
        }
    }

    renderTransactions() {
        this.transactionsBody.innerHTML = '';
        
        this.transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.description}</td>
                <td class="expense">-$${transaction.amount.toFixed(2)}</td>
                <td>
                    <button onclick="expenseTracker.deleteTransaction(${transaction.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            this.transactionsBody.appendChild(row);
        });
    }

    deleteTransaction(id) {
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveToLocalStorage();
        this.updateUI();
        
        const analyticsView = document.getElementById('analytics-view');
        if (analyticsView.style.display === 'block') {
            this.updateAnalytics();
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    setupBudgetModal() {
        const modal = document.getElementById('budget-modal');
        const budgetBtn = document.getElementById('set-budget');
        const budgetForm = document.getElementById('budget-form');

        budgetBtn.addEventListener('click', () => {
            modal.classList.add('show');
            document.getElementById('initial-budget').value = this.budget;
        });

        budgetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.budget = parseFloat(document.getElementById('initial-budget').value);
            localStorage.setItem('budget', this.budget);
            this.updateUI();
            modal.classList.remove('show');
            this.showNotification('Money made updated successfully!');
        });
    }

    setupExportButtons() {
        document.getElementById('export-csv').addEventListener('click', () => this.exportToCSV());
        document.getElementById('export-pdf').addEventListener('click', () => this.exportToPDF());
    }

    exportToCSV() {
        const headers = ['Description', 'Amount'];
        let csvContent = headers.join(',') + '\n';

        this.transactions.forEach(transaction => {
            const row = [
                transaction.description,
                `-$${transaction.amount.toFixed(2)}`
            ].map(cell => `"${cell}"`).join(',');
            csvContent += row + '\n';
        });

        // Add summary at the end
        csvContent += '\n"Total Money Made","$' + this.budget.toFixed(2) + '"\n';
        csvContent += '"Total Spent","$' + this.getTotalExpenses().toFixed(2) + '"\n';
        csvContent += '"Remaining Balance","$' + (this.budget - this.getTotalExpenses()).toFixed(2) + '"\n';

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `expenses_${new Date().toLocaleDateString()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    exportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add title
        doc.setFontSize(18);
        doc.text('Find below attached', 14, 20);
        
        // Add summary
        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        doc.text(`Total Money Made: $${this.budget.toFixed(2)}`, 14, 40);
        doc.text(`Total Spent: $${this.getTotalExpenses().toFixed(2)}`, 14, 50);
        doc.text(`Remaining Balance: $${(this.budget - this.getTotalExpenses()).toFixed(2)}`, 14, 60);

        // Add transactions table
        const tableData = this.transactions.map(t => [
            t.description,
            `-$${t.amount.toFixed(2)}`
        ]);

        doc.autoTable({
            startY: 70,
            head: [['Description', 'Amount']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [44, 62, 80] },
            foot: [
                ['Total', `-$${this.getTotalExpenses().toFixed(2)}`]
            ],
            footStyles: { fillColor: [44, 62, 80] }
        });

        doc.save(`expenses_${new Date().toLocaleDateString()}.pdf`);
    }

    getTotalExpenses() {
        return this.transactions.reduce((sum, t) => sum + t.amount, 0);
    }

    handleNavigation(item) {
        // Remove active class from all items
        document.querySelectorAll('.sidebar li').forEach(i => i.classList.remove('active'));
        // Add active class to clicked item
        item.classList.add('active');
        
        const section = item.getAttribute('data-section');
        if (section === 'charts') {
            this.showAnalytics();
        } else {
            document.getElementById('analytics-view').style.display = 'none';
        }
    }

    showAnalytics() {
        const analyticsView = document.getElementById('analytics-view');
        analyticsView.style.display = 'block';
        this.updateAnalytics();
    }

    toggleAnalyticsView(btn) {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const view = btn.getAttribute('data-view');
        const chartsView = document.querySelector('.charts-view');
        const tableView = document.querySelector('.table-view');

        if (view === 'charts') {
            chartsView.style.display = 'block';
            tableView.style.display = 'none';
            this.updateCharts();
        } else {
            chartsView.style.display = 'none';
            tableView.style.display = 'block';
            this.updateAnalyticsTable();
        }
    }

    updateAnalytics() {
        this.updateCharts();
        this.updateAnalyticsTable();
    }

    updateCharts() {
        // Destroy existing charts if they exist
        if (this.spendingChart) {
            this.spendingChart.destroy();
        }
        if (this.expensesChart) {
            this.expensesChart.destroy();
        }

        this.updateSpendingOverview();
        this.updateTopExpenses();
    }

    updateSpendingOverview() {
        const ctx = document.getElementById('spending-overview').getContext('2d');
        const totalSpent = this.getTotalExpenses();
        const remaining = this.budget - totalSpent;
        const spentPercentage = ((totalSpent / this.budget) * 100).toFixed(1);

        // Group expenses by description
        const expensesByDescription = {};
        this.transactions.forEach(t => {
            expensesByDescription[t.description] = (expensesByDescription[t.description] || 0) + t.amount;
        });

        // Sort expenses by amount
        const sortedExpenses = Object.entries(expensesByDescription)
            .sort(([,a], [,b]) => b - a);

        // Color palette for different expense categories
        const expenseColors = [
            // Reds
            '#e74c3c', '#c0392b', '#ff6b6b', '#ff4757', '#ff6348',
            // Oranges
            '#e67e22', '#f39c12', '#f1c40f', '#ffa502', '#ff7f50',
            // Greens
            '#2ecc71', '#27ae60', '#00b894', '#00cec9', '#20bf6b',
            // Blues
            '#3498db', '#2980b9', '#0984e3', '#74b9ff', '#6c5ce7',
            // Purples
            '#9b59b6', '#8e44ad', '#a55eea', '#a364bd', '#9c88ff',
            // Teals
            '#1abc9c', '#16a085', '#00b5ad', '#26de81', '#2bcbba',
            // Grays
            '#34495e', '#607d8b', '#95a5a6', '#636e72', '#747d8c',
            // Other colors
            '#d35400', '#c23616', '#833471', '#218c74', '#227093',
            '#cd6133', '#cd853f', '#5f27cd', '#474787', '#40407a',
            '#2c2c54', '#227093', '#218c74', '#84817a', '#cc8e35'
        ];

        // Prepare data for the chart
        const labels = sortedExpenses.map(([desc, amount]) => {
            const percentage = ((amount / this.budget) * 100).toFixed(1);
            return `${desc} (${percentage}%)`;
        });

        if (remaining > 0) {
            labels.push(`Remaining (${((remaining / this.budget) * 100).toFixed(1)}%)`);
        }

        const data = sortedExpenses.map(([,amount]) => amount);
        if (remaining > 0) {
            data.push(remaining);
        }

        const colors = sortedExpenses.map((_, index) => expenseColors[index % expenseColors.length]);
        if (remaining > 0) {
            colors.push('rgba(52, 73, 94, 0.2)');
        }

        this.spendingChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const percentage = ((value / this.budget) * 100).toFixed(1);
                                return `$${value.toFixed(2)} (${percentage}% of budget)`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }

    updateTopExpenses() {
        const ctx = document.getElementById('top-expenses').getContext('2d');
        const expensesByDescription = {};
        
        this.transactions.forEach(t => {
            expensesByDescription[t.description] = (expensesByDescription[t.description] || 0) + t.amount;
        });

        const sortedExpenses = Object.entries(expensesByDescription)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);

        const totalAmount = sortedExpenses.reduce((sum, [,amount]) => sum + amount, 0);
        const colors = [
            'rgba(52, 152, 219, 0.8)',  // Blue
            'rgba(155, 89, 182, 0.8)',  // Purple
            'rgba(52, 73, 94, 0.8)',    // Dark Gray
            'rgba(26, 188, 156, 0.8)',  // Turquoise
            'rgba(46, 204, 113, 0.8)'   // Green
        ];

        this.expensesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedExpenses.map(([desc]) => desc),
                datasets: [{
                    label: 'Amount ($)',
                    data: sortedExpenses.map(([,amount]) => amount),
                    backgroundColor: colors,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            display: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const percentage = ((value / totalAmount) * 100).toFixed(1);
                                return `$${value.toFixed(2)} (${percentage}% of total)`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateAnalyticsTable() {
        const tbody = document.querySelector('#analytics-table tbody');
        tbody.innerHTML = '';
        
        const totalSpent = this.getTotalExpenses();
        const expensesByDescription = {};
        
        this.transactions.forEach(t => {
            expensesByDescription[t.description] = (expensesByDescription[t.description] || 0) + t.amount;
        });

        const sortedExpenses = Object.entries(expensesByDescription)
            .sort(([,a], [,b]) => b - a);

        sortedExpenses.forEach(([description, amount]) => {
            const percentage = (amount / totalSpent * 100).toFixed(1);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${description}</td>
                <td>$${amount.toFixed(2)}</td>
                <td>
                    ${percentage}%
                    <div class="percentage-bar">
                        <div class="percentage-fill" style="width: ${percentage}%"></div>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Initialize the expense tracker
const expenseTracker = new ExpenseTracker();
