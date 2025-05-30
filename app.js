
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { 
            getAuth, 
            createUserWithEmailAndPassword, 
            signInWithEmailAndPassword, 
            signOut, 
            onAuthStateChanged 
        } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { 
            getFirestore, 
            collection, 
            addDoc, 
            doc, 
            setDoc, 
            getDoc,
            updateDoc, 
            deleteDoc, 
            onSnapshot, 
            query, 
            where,
            orderBy,
            serverTimestamp, // Import for server-side timestamps
            setLogLevel 
        } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        const { jsPDF } = window.jspdf;

        // Logo da empresa para PDF (opcional). Se não houver logo, pode deixar como null.
        const COMPANY_LOGO_BASE64 = null; 
        
        // Configuração do Firebase 
        const firebaseConfig = {
            apiKey: "AIzaSyCcdNZidSeOxy2A2uyl7Rbgv2_cMMKBNzQ", // Substitua pela sua API Key real
            authDomain: "sistema-producao-3f.firebaseapp.com",
            projectId: "sistema-producao-3f",
            storageBucket: "sistema-producao-3f.firebasestorage.app", 
            messagingSenderId: "568820985788",
            appId: "1:568820985788:web:f523e97bab8fbf8b27c5b9"
        };
        
        const internalAppId = '3f-producao-app'; 
        
        const appIdDisplayEl = document.getElementById('appIdDisplay');
        if (appIdDisplayEl) appIdDisplayEl.textContent = internalAppId;

        const fbApp = initializeApp(firebaseConfig);
        const db = getFirestore(fbApp);
        const auth = getAuth(fbApp);
        setLogLevel('debug'); 

        let currentAuthUser = null; 
        let currentUserProfile = null; 
        let ordersCollectionRef = null;
        let collaboratorsCollectionRef = null;
        let notificationsCollectionRef = null; // New collection ref
        let unsubscribeOrders = null;
        let unsubscribeCollaborators = null;
        let unsubscribeNotifications = null; // For notification listener
        let allOrdersCache = [];
        let allCollaboratorsCache = [];
        let userNotificationsCache = []; // Cache for user's notifications
        let dailyLoadCache = {}; 
        let currentCalendarDate = new Date(); 
        let isOrderSelectionModeActive = false; 
        let selectedOrdersForDeletion = new Set(); 
        let currentReportCalendarType = 'delivery'; // 'delivery' ou 'production'

const ALL_POSSIBLE_STAGES = [
    { key: 'ripando', name: 'Ripando' },
    { key: 'impressao', name: 'Impressão' },
    { key: 'secagem_impressao', name: 'Secagem da Impressão' }, // ETAPA ADICIONADA/MODIFICADA
    { key: 'recorte', name: 'Recorte' },
    { key: 'resina', name: 'Resina' },
    { key: 'secagem_resina', name: 'Secagem da Resina' },  // ETAPA RENOMEADA/REPOSICIONADA
    { key: 'acabamento', name: 'Acabamento' },
    { key: 'embalagem', name: 'Embalagem' }
];
        const MANAGER_ROLE = 'manager';
        const EMPLOYEE_ROLE = 'employee';
        const MANAGER_REVIEW_STAGE_KEY = 'manager_review'; 
        const COMPLETED_STAGE_KEY = 'pronto';

const STATUS_TEXT_MAP = {
    ripando: 'Ripando',
    impressao: 'Impressão',
    secagem_impressao: 'Secagem da Impressão', // NOVO TEXTO PARA NOVA ETAPA
    recorte: 'Recorte',
    resina: 'Resina',
    secagem_resina: 'Secagem da Resina',  // TEXTO ATUALIZADO PARA ETAPA RENOMEADA
    acabamento: 'Acabamento',
    embalagem: 'Embalagem',
    [MANAGER_REVIEW_STAGE_KEY]: 'Revisão Gerente', // Mantenha esta e as próximas se já existiam
    [COMPLETED_STAGE_KEY]: 'Pronto',
    estimation: 'Coletando Estimativas'
};        
        const ORDER_PHASE_TEXT_MAP = {
            estimation: 'Estimativa',
            manager_review: 'Revisão Gerente',
            production: 'Produção',
            completed: 'Concluído'
        };

        // Elementos da UI
        const loginSectionEl = document.getElementById('loginSection');
        const appContentEl = document.getElementById('appContent');
        const loginFormEl = document.getElementById('loginForm');
        const loginErrorEl = document.getElementById('loginError');
        const userInfoEl = document.getElementById('userInfo');
        const userNameDisplayEl = document.getElementById('userNameDisplay');
        const logoutBtnEl = document.getElementById('logoutBtn');
        const authStatusContainerGlobalEl = document.getElementById('authStatusContainerGlobal');
        const authUserIdGlobalEl = document.getElementById('authUserIdGlobal');
        const navDashboardBtnEl = document.getElementById('navDashboardBtn'); 
        const navEstimatesControlBtnEl = document.getElementById('navEstimatesControlBtn');
        const navNewOrderBtnEl = document.getElementById('navNewOrderBtn'); 
        const navUserManagementBtnEl = document.getElementById('navUserManagementBtn');
        const navMyQueueBtnEl = document.getElementById('navMyQueueBtn'); 
        
        const orderFormEl = document.getElementById('orderForm');
        const allOrdersTableBodyEl = document.getElementById('allOrdersTableBody');
        const myQueueEstimationListEl = document.getElementById('myQueueEstimationList'); 
        const myQueueProductionListEl = document.getElementById('myQueueProductionList'); 
        const myQueueTitleEl = document.getElementById('myQueueTitle');
        const loadingIndicatorEl = document.getElementById('loadingIndicator');
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('.section-content');
        const timeDashboardContainerEl = document.getElementById('timeDashboardContainer');
        const orderFilterInputEl = document.getElementById('orderFilterInput');
        const clearOrderFilterBtnEl = document.getElementById('clearOrderFilterBtn');
        const dashboardFilterInputEl = document.getElementById('dashboardFilterInput');
        const clearDashboardFilterBtnEl = document.getElementById('clearDashboardFilterBtn');
        const dashboardTitleEl = document.getElementById('dashboardTitle');
        const productionStagesCheckboxesEl = document.getElementById('productionStagesCheckboxes');
        const imagePreviewModalEl = document.getElementById('imagePreviewModal');
        const previewImageSrcEl = document.getElementById('previewImageSrc');
        const orderItemsContainerEl = document.getElementById('orderItemsContainer');
        const addOrderItemBtnEl = document.getElementById('addOrderItemBtn');
        const dailyLoadReportContainerEl = document.getElementById('dailyLoadReportContainer');
        const myQueueFilterInputEl = document.getElementById('myQueueFilterInput'); 
        const clearMyQueueFilterBtnEl = document.getElementById('clearMyQueueFilterBtn'); 
        const addCollaboratorFormEl = document.getElementById('addCollaboratorForm');
        const collabStagesCheckboxesEl = document.getElementById('collabStagesCheckboxes');
        const collaboratorsListEl = document.getElementById('collaboratorsList');
        const estimatesControlContainerEl = document.getElementById('estimatesControlContainer');
        const estimatesControlFilterInputEl = document.getElementById('estimatesControlFilterInput');
        const clearEstimatesControlFilterBtnEl = document.getElementById('clearEstimatesControlFilterBtn');
        const descriptionTextAreaEl = document.getElementById('description');


        // Elementos do Modal de Relatório de Pedido
        const orderDetailsReportModalEl = document.getElementById('orderDetailsReportModal');
        const reportClientNameEl = document.getElementById('reportClientName');
        const reportOrderIdEl = document.getElementById('reportOrderId');
        const reportCreatedAtEl = document.getElementById('reportCreatedAt');
        const reportProductionStartDateEl = document.getElementById('reportProductionStartDate'); 
        const reportDeliveryDateEl = document.getElementById('reportDeliveryDate');
        const reportPriorityEl = document.getElementById('reportPriority');
        const reportOrderPhaseEl = document.getElementById('reportOrderPhase');
        const reportOrderStatusEl = document.getElementById('reportOrderStatus');
        const reportCoverImageEl = document.getElementById('reportCoverImage');
        const reportCoverImageErrorEl = document.getElementById('reportCoverImageError');
        const reportOrderItemsEl = document.getElementById('reportOrderItems');
        const reportSelectedStagesEl = document.getElementById('reportSelectedStages');
        const reportDescriptionEl = document.getElementById('reportDescription');
        const reportDetailedTimelineEl = document.getElementById('reportDetailedTimeline');
        const reportQCTableBodyEl = document.getElementById('reportQCTableBody');

        // Elementos do Modal de Detalhes da Carga Diária
        const dailyLoadDetailsModalEl = document.getElementById('dailyLoadDetailsModal');
        const dailyLoadDetailsModalTitleEl = document.getElementById('dailyLoadDetailsModalTitle');
        const dailyLoadDetailsModalBodyEl = document.getElementById('dailyLoadDetailsModalBody');

        // Elementos do Relatório de Calendário
        const reportViewListBtnEl = document.getElementById('reportViewListBtn');
        const reportViewCalendarBtnEl = document.getElementById('reportViewCalendarBtn');
        const dailyLoadReportListContainerEl = document.getElementById('dailyLoadReportListContainer');
        const calendarViewContainerEl = document.getElementById('calendarViewContainer');
        const calendarMonthYearEl = document.getElementById('calendarMonthYear');
        const prevMonthBtnEl = document.getElementById('prevMonthBtn');
        const nextMonthBtnEl = document.getElementById('nextMonthBtn');
        const calendarDaysNamesEl = document.getElementById('calendarDaysNames');
        const calendarDaysGridEl = document.getElementById('calendarDaysGrid');
        const calendarModeToggleContainerEl = document.getElementById('calendarModeToggleContainer');
        const calendarModeDeliveryBtnEl = document.getElementById('calendarModeDeliveryBtn');
        const calendarModeProductionBtnEl = document.getElementById('calendarModeProductionBtn');


        // Botões de exclusão em massa
        const toggleOrderSelectionModeBtnEl = document.getElementById('toggleOrderSelectionModeBtn');
        const deleteSelectedOrdersBtnEl = document.getElementById('deleteSelectedOrdersBtn');

        // Elementos do Modal de Edição de Datas
        const editOrderDatesModalEl = document.getElementById('editOrderDatesModal');
        const editOrderIdInputEl = document.getElementById('editOrderId');
        const editProductionStartDateInputEl = document.getElementById('editProductionStartDate');
        const editDeliveryDateInputEl = document.getElementById('editDeliveryDate');
        const saveOrderDatesBtnEl = document.getElementById('saveOrderDatesBtn');

        // Elementos do Modal de Edição de Colaborador
        const editCollaboratorModalEl = document.getElementById('editCollaboratorModal');
        const editCollaboratorIdInputEl = document.getElementById('editCollaboratorId');
        const editCollabNameInputEl = document.getElementById('editCollabName');
        const editCollabEmailInputEl = document.getElementById('editCollabEmail');
        const editCollabRoleSelectEl = document.getElementById('editCollabRole');
        const editCollabStagesCheckboxesEl = document.getElementById('editCollabStagesCheckboxes');
        const saveCollaboratorChangesBtnEl = document.getElementById('saveCollaboratorChangesBtn');
        
        // Elementos de Notificação
        const toastContainerEl = document.getElementById('toastContainer');
        const notificationBellContainerEl = document.getElementById('notificationBellContainer');
        const notificationBellBtnEl = document.getElementById('notificationBellBtn');
        const notificationCountBadgeEl = document.getElementById('notificationCountBadge');
        const notificationDropdownEl = document.getElementById('notificationDropdown');
        const notificationListEl = document.getElementById('notificationList');
        const markAllNotificationsReadBtnEl = document.getElementById('markAllNotificationsReadBtn');
        
        // --- Notification System Functions ---
        function showToast(message, type = 'info', duration = 3000) {
            if (!toastContainerEl) return;

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            
            let iconSvg = '';
            if (type === 'success') iconSvg = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
            else if (type === 'error') iconSvg = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
            else if (type === 'warning') iconSvg = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
            else iconSvg = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

            toast.innerHTML = `${iconSvg}<span>${message}</span>`;
            toastContainerEl.appendChild(toast);

            setTimeout(() => {
                toast.remove();
            }, duration + 500); // +500ms for animation out
        }

        async function createNotification(targetUserId, message, orderId = null, sectionTarget = null, type = 'info') {
            if (!targetUserId || !message) {
                console.warn("createNotification: targetUserId ou message faltando.");
                return;
            }
            if (!notificationsCollectionRef) {
                 console.error("createNotification: notificationsCollectionRef não está definido.");
                return;
            }
            try {
                await addDoc(notificationsCollectionRef, {
                    appId: internalAppId,
                    userId: targetUserId,
                    message: message,
                    orderId: orderId,
                    sectionTarget: sectionTarget, // e.g., 'myQueue' or 'allOrders'
                    type: type, // e.g., 'new_task', 'approval_needed'
                    createdAt: serverTimestamp(),
                    isRead: false
                });
                console.log(`[DEBUG] Notificação criada para ${targetUserId}: ${message}`);
            } catch (error) {
                console.error("Erro ao criar notificação:", error);
            }
        }
        
        function listenForNotifications() {
            if (unsubscribeNotifications) unsubscribeNotifications();
            if (!currentAuthUser || !notificationsCollectionRef) return;

            const q = query(
                notificationsCollectionRef,
                where("appId", "==", internalAppId),
                where("userId", "==", currentAuthUser.uid),
                orderBy("createdAt", "desc")
            );

            unsubscribeNotifications = onSnapshot(q, (querySnapshot) => {
                userNotificationsCache = [];
                querySnapshot.forEach(doc => {
                    userNotificationsCache.push({ id: doc.id, ...doc.data() });
                });
                renderNotificationDropdown(userNotificationsCache);
                updateNotificationBadge(userNotificationsCache);
            }, (error) => {
                console.error("Erro ao ouvir notificações:", error);
                showToast("Erro ao carregar notificações.", "error");
            });
        }

        function updateNotificationBadge(notifications) {
             if (!notificationCountBadgeEl || !notificationBellContainerEl) return;
            const unreadCount = notifications.filter(n => !n.isRead).length;
            if (unreadCount > 0) {
                notificationCountBadgeEl.textContent = unreadCount > 9 ? '9+' : unreadCount;
                notificationCountBadgeEl.classList.remove('hidden');
            } else {
                notificationCountBadgeEl.classList.add('hidden');
            }
            notificationBellContainerEl.classList.remove('hidden');
        }

        // CORREÇÃO 3: Função renderNotificationDropdown corrigida
        function renderNotificationDropdown(notifications) {
            if (!notificationListEl) return;
            if (notifications.length === 0) {
                notificationListEl.innerHTML = '<p class="text-center text-gray-500 py-4 text-sm">Nenhuma notificação.</p>';
                return;
            }

            notificationListEl.innerHTML = notifications.map(n => {
                // Correção: verificar se createdAt é um Timestamp do Firebase ou uma string
                let timeAgo = 'agora';
                if (n.createdAt) {
                    try {
                        // Se for um Timestamp do Firebase (tem método toDate)
                        if (n.createdAt.toDate && typeof n.createdAt.toDate === 'function') {
                            timeAgo = formatTimeAgo(n.createdAt.toDate());
                        }
                        // Se for uma string de data ou objeto Date
                        else {
                            const date = new Date(n.createdAt);
                            if (!isNaN(date.getTime())) {
                                timeAgo = formatTimeAgo(date);
                            }
                        }
                    } catch (error) {
                        console.warn('[DEBUG] Erro ao formatar data da notificação:', error);
                        timeAgo = 'recente';
                    }
                }
                
                return `
                    <div class="notification-item ${n.isRead ? 'is-read' : ''} notification-type-${n.type || 'info'}" data-id="${n.id}" data-order-id="${n.orderId || ''}" data-section="${n.sectionTarget || ''}">
                        <p class="font-medium">${n.message}</p>
                        <small>${timeAgo}</small>
                    </div>
                `;
            }).join('');
        }
        
        async function markNotificationAsRead(notificationId) {
            if (!notificationId || !notificationsCollectionRef) return;
            try {
                const notifRef = doc(notificationsCollectionRef, notificationId);
                await updateDoc(notifRef, { isRead: true });
            } catch (error) {
                console.error("Erro ao marcar notificação como lida:", error);
                showToast("Erro ao atualizar notificação.", "error");
            }
        }

        async function markAllNotificationsAsRead() {
            if (!currentAuthUser || !notificationsCollectionRef) return;
            showLoading();
            const unreadNotifications = userNotificationsCache.filter(n => !n.isRead);
            if (unreadNotifications.length === 0) {
                hideLoading();
                showToast("Todas as notificações já estão lidas.", "info");
                return;
            }
            try {
                for (const notif of unreadNotifications) {
                    const notifRef = doc(notificationsCollectionRef, notif.id);
                    await updateDoc(notifRef, { isRead: true });
                }
                showToast("Todas as notificações marcadas como lidas.", "success");
            } catch (error) {
                console.error("Erro ao marcar todas as notificações como lidas:", error);
                showToast("Erro ao atualizar notificações.", "error");
            } finally {
                hideLoading();
            }
        }
        
        function formatTimeAgo(date) {
            const seconds = Math.floor((new Date() - date) / 1000);
            let interval = seconds / 31536000;
            if (interval > 1) return Math.floor(interval) + "a atrás";
            interval = seconds / 2592000;
            if (interval > 1) return Math.floor(interval) + "m atrás";
            interval = seconds / 86400;
            if (interval > 1) return Math.floor(interval) + "d atrás";
            interval = seconds / 3600;
            if (interval > 1) return Math.floor(interval) + "h atrás";
            interval = seconds / 60;
            if (interval > 1) return Math.floor(interval) + "min atrás";
            return Math.floor(seconds) + "s atrás";
        }

        // Função para limpar todas as notificações do usuário logado
async function clearAllNotificationsForUser() {
    if (!currentAuthUser || !notificationsCollectionRef) return;
    showLoading();
    const notificationsToDelete = userNotificationsCache.map(n => n.id);
    if (notificationsToDelete.length === 0) {
        hideLoading();
        showToast("Nenhuma notificação para apagar.", "info");
        return;
    }
    try {
        for (const notifId of notificationsToDelete) {
            const notifRef = doc(notificationsCollectionRef, notifId);
            await deleteDoc(notifRef);
        }
        showToast("Notificações apagadas.", "success");
    } catch (error) {
        console.error("Erro ao apagar notificações:", error);
        showToast("Erro ao apagar notificações.", "error");
    } finally {
        hideLoading();
    }
}

// Listener para o botão "Limpar notificações"
if (typeof markAllNotificationsReadBtnEl !== "undefined") {
    const clearAllNotificationsBtnEl = document.getElementById('clearAllNotificationsBtn');
    if (clearAllNotificationsBtnEl) {
        clearAllNotificationsBtnEl.addEventListener('click', (e) => {
            e.stopPropagation();
            showGenericModal(
                "Limpar todas notificações?",
                "Tem certeza que deseja apagar TODAS as suas notificações? Esta ação não pode ser desfeita.",
                [
                    { text: "Sim, limpar", type: "danger", callback: () => clearAllNotificationsForUser() },
                    { text: "Cancelar", type: "secondary" }
                ]
            );
        });
    }
}

// --- End Notification System Functions ---


        function renderEstimatesControl() {
            console.log("[DEBUG] renderEstimatesControl chamada");
            if (!estimatesControlContainerEl) {
                console.error("[DEBUG] estimatesControlContainerEl não encontrado");
                return;
            }
            
            if (!currentUserProfile || currentUserProfile.role !== MANAGER_ROLE) {
                console.log("[DEBUG] Usuário não é gerente, não exibindo controle de estimativas");
                estimatesControlContainerEl.innerHTML = '<div class="card text-center"><p class="text-gray-500">Apenas gerentes podem acessar esta seção.</p></div>';
                return;
            }

            const filterValue = estimatesControlFilterInputEl ? estimatesControlFilterInputEl.value.toLowerCase().trim() : "";
            console.log("[DEBUG] Filtro aplicado:", filterValue);
            
            let estimationOrders = allOrdersCache.filter(order => order.orderPhase === 'estimation' && order.selectedStages);
            console.log("[DEBUG] Pedidos em fase de estimativa encontrados:", estimationOrders.length);
            
            if (filterValue) {
                estimationOrders = estimationOrders.filter(order => 
                    (order.id.toLowerCase().includes(filterValue)) ||
                    (order.clientName && order.clientName.toLowerCase().includes(filterValue))
                );
                console.log("[DEBUG] Pedidos após filtro:", estimationOrders.length);
            }

            if (estimationOrders.length === 0) {
                estimatesControlContainerEl.innerHTML = `<div class="card text-center">
                    <p class="text-gray-500">Nenhum pedido aguardando estimativas ${filterValue ? 'com o filtro "' + filterValue + '"' : ''}.</p>
                </div>`;
                return;
            }

            estimatesControlContainerEl.innerHTML = estimationOrders.map(order => {
                const createdDateFormatted = formatDateTime(order.createdAt); 
                const deliveryDateFormatted = formatDate(order.deliveryDate);
                
                const totalStages = order.selectedStages.length;
                const completedEstimates = order.selectedStages.filter(stageKey => 
                    order.timeline[stageKey] && typeof order.timeline[stageKey].estimatedMinutes === 'number'
                ).length;
                
                const progressPercentage = totalStages > 0 ? Math.round((completedEstimates / totalStages) * 100) : 0;
                
                const pendingStages = order.selectedStages.filter(stageKey => 
                    !order.timeline[stageKey] || order.timeline[stageKey].estimatedMinutes === null
                ).map(stageKey => {
                    const responsibleCollabs = allCollaboratorsCache.filter(collab => 
                        collab.departments && collab.departments.includes(stageKey) && collab.role !== MANAGER_ROLE
                    );
                    return {
                        stageKey,
                        stageName: getStatusText(stageKey),
                        responsibles: responsibleCollabs.map(c => c.name.split(' ')[0]).join(', ') || 'Sem responsável'
                    };
                });

                const completedStages = order.selectedStages.filter(stageKey => 
                    order.timeline[stageKey] && typeof order.timeline[stageKey].estimatedMinutes === 'number'
                ).map(stageKey => {
                    const timelineData = order.timeline[stageKey];
                    return {
                        stageKey,
                        stageName: getStatusText(stageKey),
                        estimatedTime: formatTime(timelineData.estimatedMinutes),
                        submittedAt: formatDateTime(timelineData.estimationSubmittedAt)
                    };
                });

                const itemCount = order.items ? order.items.length : 0;
                const daysSinceCreated = Math.floor((new Date() - new Date(order.createdAt)) / (1000 * 60 * 60 * 24));
                
                let urgencyClass = 'border-l-gray-400 bg-gray-100'; 
                let urgencyText = '';

                if (daysSinceCreated >= 3) {
                    urgencyText = `<span class="text-red-600 font-medium">⚠️ ${daysSinceCreated} dias aguardando</span>`;
                } else if (daysSinceCreated >= 1) {
                    urgencyText = `<span class="text-yellow-600 font-medium">⏰ ${daysSinceCreated} dia(s) aguardando</span>`;
                } else {
                    urgencyText = `<span class="text-green-600 font-medium">🆕 Criado hoje</span>`;
                }


                return `
                    <div class="card border-l-4 ${urgencyClass} mb-4">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">#${order.id.substring(0,8)} - ${order.clientName}</h3>
                                <div class="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                    <span>Criado: ${createdDateFormatted}</span>
                                    <span>Entrega: ${deliveryDateFormatted}</span>
                                    <span>${itemCount} item(ns)</span>
                                    <span class="status-badge priority-${order.priority}">${(order.priority || 'normal').toUpperCase()}</span>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="mb-2">${urgencyText}</div>
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-medium">Progresso:</span>
                                    <div class="w-24 bg-gray-200 rounded-full h-2">
                                        <div class="bg-brand h-2 rounded-full transition-all duration-300" style="width: ${progressPercentage}%"></div>
                                    </div>
                                    <span class="text-sm font-medium text-brand">${completedEstimates}/${totalStages}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            ${pendingStages.length > 0 ? `
                                <div>
                                    <h4 class="font-medium text-red-700 mb-3 flex items-center gap-2">
                                        <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                        Estimativas Pendentes (${pendingStages.length})
                                    </h4>
                                    <div class="space-y-2">
                                        ${pendingStages.map(stage => `
                                            <div class="flex justify-between items-center p-2 bg-red-50 rounded border border-red-200">
                                                <span class="font-medium text-red-800">${stage.stageName}</span>
                                                <span class="text-sm text-red-600">${stage.responsibles}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${completedStages.length > 0 ? `
                                <div>
                                    <h4 class="font-medium text-green-700 mb-3 flex items-center gap-2">
                                        <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                        Estimativas Recebidas (${completedStages.length})
                                    </h4>
                                    <div class="space-y-2">
                                        ${completedStages.map(stage => `
                                            <div class="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
                                                <span class="font-medium text-green-800">${stage.stageName}</span>
                                                <div class="text-right">
                                                    <span class="text-sm font-medium text-green-700">${stage.estimatedTime}</span>
                                                    <br>
                                                    <span class="text-xs text-green-600">${stage.submittedAt}</span>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${order.description ? `<div class="mt-4 p-3 bg-gray-50 rounded text-sm"><strong>Obs:</strong> ${order.description}</div>` : ''}
                    </div>
                `;
            }).join('');
            
            console.log("[DEBUG] renderEstimatesControl concluída com", estimationOrders.length, "pedidos renderizados");
        }

        // 1. Funções Utilitárias
        function getStatusText(statusKey) { return STATUS_TEXT_MAP[statusKey] || statusKey; }
        function getStatusTextForPDF(statusKey) {
            const textWithEmoji = STATUS_TEXT_MAP[statusKey] || statusKey;
            if (textWithEmoji) { return textWithEmoji.replace(/[^\x00-\x7F]/g, "").trim(); }
            return textWithEmoji;
        }
        function getOrderPhaseText(phaseKey) { return ORDER_PHASE_TEXT_MAP[phaseKey] || phaseKey; }
        function getOrderPhaseTextForPDF(phaseKey) {
            const textWithEmoji = ORDER_PHASE_TEXT_MAP[phaseKey] || phaseKey;
             if (textWithEmoji) { return textWithEmoji.replace(/[^\x00-\x7F]/g, "").trim(); }
            return textWithEmoji;
        }
        function formatTime(minutes) {
            if (minutes === null || typeof minutes === 'undefined' || isNaN(minutes)) return "N/A";
            if (minutes === 0) return "0min";
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            return `${h > 0 ? h + 'h ' : ''}${m}min`.trim();
        }
        function formatDate(dateString) {
            if (!dateString) return "N/A";
            try {
                let date;
                if (dateString.includes('T')) {
                    date = new Date(dateString);
                } else {
                    date = new Date(dateString + 'T00:00:00');
                }
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            } catch (e) { 
                console.warn("Erro ao formatar data (formatDate):", dateString, e);
                return dateString; 
            }
        }
        function formatDateTime(dateTimeString) {
            if (!dateTimeString) return "N/A";
            try {
                const date = new Date(dateTimeString);
                return date.toLocaleString('pt-BR', { 
                    day: '2-digit', month: '2-digit', year: 'numeric', 
                    hour: '2-digit', minute: '2-digit' 
                });
            } catch (e) { 
                console.warn("Erro ao formatar data e hora (formatDateTime):", dateTimeString, e);
                return dateTimeString; 
            }
        }
        function showLoading() { console.log("[DEBUG] showLoading"); if (loadingIndicatorEl) loadingIndicatorEl.classList.remove('hidden'); }
        function hideLoading() { console.log("[DEBUG] hideLoading"); if (loadingIndicatorEl) loadingIndicatorEl.classList.add('hidden'); }
        
        window.closeGenericModal = function() { 
            const modalEl = document.getElementById('genericModal');
            if (modalEl) modalEl.classList.add('hidden');
        }
        window.showImagePreviewModal = function(imageUrl) {
            if (previewImageSrcEl && imagePreviewModalEl) {
                previewImageSrcEl.src = imageUrl;
                previewImageSrcEl.onerror = () => {
                    previewImageSrcEl.src = 'https://placehold.co/600x400/e5e7eb/4b5563?text=Imagem+Indispon%C3%ADvel'; 
                    previewImageSrcEl.alt = 'Imagem indisponível';
                };
                imagePreviewModalEl.classList.remove('hidden');
            }
        }
        window.closeImagePreviewModal = function() {
            if (imagePreviewModalEl) {
                imagePreviewModalEl.classList.add('hidden');
                if(previewImageSrcEl) previewImageSrcEl.src = ""; 
            }
        }

        function showGenericModal(title, message, actions = [], bodyContentHTML = null) {
            const modalTitleEl = document.getElementById('genericModalTitle');
            const modalBodyEl = document.getElementById('genericModalBody');
            const actionsContainerEl = document.getElementById('genericModalActions');
            const modalEl = document.getElementById('genericModal');

            if (!modalTitleEl || !modalBodyEl || !actionsContainerEl || !modalEl) {
                alert(title + "\n" + (bodyContentHTML ? "Conteúdo dinâmico" : message) ); 
                return;
            }
            modalTitleEl.textContent = title;

            if (bodyContentHTML) {
                modalBodyEl.innerHTML = bodyContentHTML;
            } else {
                modalBodyEl.innerHTML = message ? `<p id="genericModalMessage" class="text-gray-600 mb-6">${message}</p>` : ''; 
            }
            
            actionsContainerEl.innerHTML = ''; 

            actions.forEach(action => {
                const btn = document.createElement('button');
                btn.className = `btn btn-${action.type || 'secondary'} btn-sm`;
                btn.textContent = action.text;
                btn.onclick = () => { 
                    if (action.callback) {
                        const result = action.callback();
                        // If callback returns false AND closeOnClick is explicitly false, don't close.
                        if (result === false && action.closeOnClick === false) { 
                            return; 
                        }
                    }
                    // Close modal unless closeOnClick is explicitly false.
                    if (action.closeOnClick !== false) { 
                        closeGenericModal(); 
                    }
                };
                actionsContainerEl.appendChild(btn);
            });
             if (actions.length === 0 || !actions.find(a => a.text.toLowerCase() === 'fechar' || a.text.toLowerCase() === 'cancelar')) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'btn btn-secondary btn-sm';
                closeBtn.textContent = 'Fechar';
                closeBtn.onclick = closeGenericModal;
                actionsContainerEl.appendChild(closeBtn);
            }
            modalEl.classList.remove('hidden');
        }

        // 2. Funções de Lógica de Itens de Pedido
        function createOrderItemHTML(isFirstItem = false) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'card grid grid-cols-1 md:grid-cols-4 gap-4 items-end';
            itemDiv.innerHTML = `
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Material</label>
                    <input type="text" name="item_material" class="form-input w-full" placeholder="Ex: Vinil Fosco" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
                    <input type="number" name="item_quantity" class="form-input w-full" min="1" required>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Largura (cm)</label>
                        <input type="number" name="item_width" class="form-input w-full" min="0.1" step="0.1" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Altura (cm)</label>
                        <input type="number" name="item_height" class="form-input w-full" min="0.1" step="0.1" required>
                    </div>
                </div>
                <div class="flex justify-end">
                    ${!isFirstItem ? `<button type="button" class="btn btn-danger btn-icon remove-item-btn" title="Remover item">
                        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>` : ''}
                </div>
            `;
            if (!isFirstItem) {
                itemDiv.querySelector('.remove-item-btn').addEventListener('click', () => itemDiv.remove());
            }
            return itemDiv;
        }

        function addOrderItem(isFirst = false) {
            console.log("[DEBUG] addOrderItem chamada. isFirst:", isFirst);
            if (orderItemsContainerEl) {
                orderItemsContainerEl.appendChild(createOrderItemHTML(isFirst));
            } else {
                console.error("[DEBUG] orderItemsContainerEl não encontrado em addOrderItem");
            }
        }
        
        // 3. Funções de Renderização
        function renderAllOrdersTable() {
            console.log("[DEBUG] renderAllOrdersTable chamada. Cache de pedidos:", allOrdersCache.length);
            if (!allOrdersTableBodyEl) { console.error("[DEBUG] allOrdersTableBodyEl não encontrado em renderAllOrdersTable"); return; }
            
            const orderSelectTh = document.querySelector('.order-select-th');
            if (orderSelectTh) { 
                orderSelectTh.style.display = isOrderSelectionModeActive && currentUserProfile && currentUserProfile.role === MANAGER_ROLE ? '' : 'none';
            }


            const filterValue = orderFilterInputEl ? orderFilterInputEl.value.toLowerCase().trim() : "";
            let ordersToRender = allOrdersCache;

            if (filterValue) {
                ordersToRender = allOrdersCache.filter(order => 
                    (order.id.substring(0, 5).toLowerCase().includes(filterValue)) ||
                    (order.clientName && order.clientName.toLowerCase().includes(filterValue))
                );
            }

            if (ordersToRender.length === 0) {
                const colspan = isOrderSelectionModeActive && currentUserProfile && currentUserProfile.role === MANAGER_ROLE ? 12 : 11;
                allOrdersTableBodyEl.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-8 text-gray-500">Nenhum pedido encontrado ${filterValue ? 'com o filtro "' + filterValue + '"' : ''}.</td></tr>`;
                return;
            }
            
            allOrdersTableBodyEl.innerHTML = ordersToRender.map(order => {
                const deliveryDateFormatted = formatDate(order.deliveryDate);
                const createdDateTimeFormatted = formatDateTime(order.createdAt); 
                const productionStartDateFormatted = order.productionStartDate ? formatDate(order.productionStartDate) : 'N/A'; 
                
                let statusDisplay = getStatusText(order.status);
                if (order.orderPhase === 'estimation') {
                    statusDisplay = getStatusText('estimation'); 
                } else {
                    const stageKey = order.status;
                    const collab = allCollaboratorsCache.find(c => c.departments && c.departments.includes(stageKey));
                    if (collab) statusDisplay += ` (${collab.name.split(' ')[0]})`;
                    else { 
                        if(stageKey === MANAGER_REVIEW_STAGE_KEY){
                             const manager = allCollaboratorsCache.find(c => c.role === MANAGER_ROLE);
                             if(manager) statusDisplay += ` (${manager.name.split(' ')[0]})`;
                        }
                    }
                }
                
                let calculatedTotalEstimatedTime = 0;
                if (order.timeline && order.selectedStages) { 
                    order.selectedStages.forEach(stageKey => {
                        if (order.timeline[stageKey] && typeof order.timeline[stageKey].estimatedMinutes === 'number') {
                            calculatedTotalEstimatedTime += order.timeline[stageKey].estimatedMinutes;
                        }
                    });
                }
                const itemCount = order.items ? order.items.length : 0;
                const firstItemDesc = order.items && order.items[0] ? `${order.items[0].quantity}x ${order.items[0].material}` : 'N/A';

                let actionsHTML = ''; 

                actionsHTML += `<button class="btn btn-secondary btn-icon view-report-btn" data-order-id="${order.id}" title="Ver Relatório Completo">
                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                </button>`;

                if (currentUserProfile && currentUserProfile.role === MANAGER_ROLE) {
                    actionsHTML += `<button class="btn btn-secondary btn-icon edit-dates-btn ml-2" data-order-id="${order.id}" title="Editar Datas">
                        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </button>`;
                    actionsHTML += `<button class="btn btn-secondary btn-icon pdf-btn ml-2" data-order-id="${order.id}" title="Gerar PDF">
                        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                    </button>`;
                }


                return `
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="text-center order-select-td ${isOrderSelectionModeActive && currentUserProfile && currentUserProfile.role === MANAGER_ROLE ? '' : 'hidden'}">
                            <input type="checkbox" class="form-checkbox order-select-checkbox" data-order-id="${order.id}" ${selectedOrdersForDeletion.has(order.id) ? 'checked' : ''}>
                        </td>
                        <td class="text-xs font-mono text-gray-500">${order.id.substring(0, 5)}...</td>
                        <td class="font-medium">${order.clientName || 'N/A'}</td>
                        <td>${itemCount > 1 ? itemCount + ' itens' : firstItemDesc}</td>
                        <td><span class="status-badge phase-${order.orderPhase || 'estimation'}">${getOrderPhaseText(order.orderPhase)}</span></td>
                        <td><span class="status-badge status-${order.status}">${statusDisplay}</span></td>
                        <td class="text-sm text-gray-600">${createdDateTimeFormatted}</td> <td class="text-sm">${productionStartDateFormatted}</td> 
                        <td class="text-sm">${deliveryDateFormatted}</td>
                        <td><span class="status-badge priority-${order.priority}">${(order.priority || 'normal').toUpperCase()}</span></td>
                        <td class="font-medium">${formatTime(calculatedTotalEstimatedTime)}</td>
                        <td><div class="flex items-center gap-1">${actionsHTML}</div></td>
                    </tr>`;
            }).join('');

            allOrdersTableBodyEl.querySelectorAll('.pdf-btn').forEach(btn => {
                btn.addEventListener('click', () => generateOrderPDF(btn.dataset.orderId));
            });
            allOrdersTableBodyEl.querySelectorAll('.view-report-btn').forEach(btn => {
                btn.addEventListener('click', () => openOrderDetailsReportModal(btn.dataset.orderId));
            });
             allOrdersTableBodyEl.querySelectorAll('.edit-dates-btn').forEach(btn => {
                btn.addEventListener('click', () => openEditOrderDatesModal(btn.dataset.orderId));
            });
            
            allOrdersTableBodyEl.querySelectorAll('.order-select-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const orderId = e.target.dataset.orderId;
                    if (e.target.checked) {
                        selectedOrdersForDeletion.add(orderId);
                    } else {
                        selectedOrdersForDeletion.delete(orderId);
                    }
                    if(deleteSelectedOrdersBtnEl) deleteSelectedOrdersBtnEl.disabled = selectedOrdersForDeletion.size === 0;
                    if(deleteSelectedOrdersBtnEl) deleteSelectedOrdersBtnEl.textContent = selectedOrdersForDeletion.size > 0 ? `Excluir ${selectedOrdersForDeletion.size} Selecionado(s)` : 'Excluir Selecionados';
                });
            });
        }

        function renderOrderCard(order) {
             if(!currentUserProfile) return ''; 
            const deliveryDateFormatted = formatDate(order.deliveryDate);
            const createdDateTimeFormatted = formatDateTime(order.createdAt); 
            const productionStartDateFormatted = order.productionStartDate ? formatDate(order.productionStartDate) : 'N/A';
            let taskSpecificHTML = '';
            let actionButtonHTML = '';
            let imageButtonHTML = ''; 
            const userDepartments = currentUserProfile.departments || [];
            const userRole = currentUserProfile.role;
            
            let relevantStageForUserInCard = order.status; 
            if (order.orderPhase === 'estimation' && order.selectedStages) {
                relevantStageForUserInCard = order.selectedStages.find(s => 
                    userDepartments.includes(s) && 
                    (!order.timeline[s] || order.timeline[s].estimatedMinutes === null)
                ) || 'estimation'; 
            }

            const itemCount = order.items ? order.items.length : 0;
            const itemsSummary = order.items && order.items.length > 0 ? 
                order.items.map(item => `${item.quantity}x ${item.material} (${item.width}x${item.height}cm)`).slice(0,2).join('; ') + (order.items.length > 2 ? '...' : '')
                : 'Nenhum item especificado';

            if (order.coverImageUrl) {
                imageButtonHTML = `<button data-image-url="${order.coverImageUrl}" class="btn btn-secondary btn-icon view-image-btn" title="Ver Imagem">
                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                </button>`;
            }

            if (order.orderPhase === 'estimation' && userRole !== MANAGER_ROLE && order.selectedStages && userDepartments.some(dept => order.selectedStages.includes(dept))) {
                const stageToEstimateForUser = order.selectedStages.find(s => userDepartments.includes(s) && (!order.timeline[s] || order.timeline[s].estimatedMinutes === null));
                if (stageToEstimateForUser) {
                    taskSpecificHTML = `
                        <div class="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <label for="estTime-${order.id}-${stageToEstimateForUser}" class="block text-sm font-medium text-gray-700 mb-2">
                                Estimativa para ${getStatusText(stageToEstimateForUser)} (minutos):
                            </label>
                            <input type="number" id="estTime-${order.id}-${stageToEstimateForUser}" 
                                   class="form-input w-32" min="0" placeholder="Ex: 30">
                        </div>`;
                    actionButtonHTML = `<button data-order-id="${order.id}" data-stage-key="${stageToEstimateForUser}" class="btn btn-primary btn-sm estimate-btn">
                        Enviar Estimativa
                    </button>`;
                }
            } else if (order.orderPhase === 'manager_review' && userRole === MANAGER_ROLE) {
                 const estimatedTimesSummary = order.selectedStages.map(sKey => 
                    `${getStatusTextForPDF(sKey)}: ${formatTime(order.timeline[sKey]?.estimatedMinutes)}`
                ).join('; ');
                taskSpecificHTML = `
                    <div class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p class="text-sm text-blue-800 font-medium">Aguardando aprovação</p>
                        <p class="text-xs text-blue-600 mt-1">Estimativas: ${estimatedTimesSummary || 'Nenhuma'}</p>
                    </div>`;
                actionButtonHTML = `<button data-order-id="${order.id}" class="btn btn-primary btn-sm prompt-prod-date-btn">
                    <svg class="icon-sm mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10V9a2 2 0 012-2h2a2 2 0 012 2v1M9 10v5a2 2 0 002 2h2a2 2 0 002-2v-5"/>
                    </svg>
                    Definir Data e Iniciar Produção
                </button>`;
            } else if (order.orderPhase === 'production' && userDepartments.includes(order.status)) {
                const prodStageData = order.timeline[order.status] || {};
                taskSpecificHTML = `
                    <div class="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                        <p class="text-sm text-green-800">Tempo Estimado: <span class="font-medium">${formatTime(prodStageData.estimatedMinutes)}</span></p>
                        ${prodStageData.actualMinutes ? `<p class="text-sm text-green-600 mt-1">Tempo Real: <span class="font-medium">${formatTime(prodStageData.actualMinutes)}</span></p>` : ''}
                        ${order.productionStartDate ? `<p class="text-sm text-gray-600 mt-1">Início Produção (Pedido): <span class="font-medium">${productionStartDateFormatted}</span></p>` : ''}
                        ${prodStageData.productionStartTime ? `<p class="text-sm text-gray-600 mt-1">Início Etapa: <span class="font-medium">${formatDateTime(prodStageData.productionStartTime)}</span></p>` : ''}
                    </div>`;
                actionButtonHTML = `<button data-order-id="${order.id}" class="btn btn-primary btn-sm advance-prod-btn">
                    <svg class="icon-sm mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Concluir Etapa
                </button>`;
            }

            if (order.orderPhase === 'completed') {
                 actionButtonHTML = `<span class="inline-flex items-center gap-2 text-green-600 font-medium">
                    <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Concluído
                 </span>`;
            }
            
             if (userRole === MANAGER_ROLE && order.orderPhase !== 'manager_review' && order.orderPhase !== 'completed' && !isOrderSelectionModeActive) { 
                 actionButtonHTML += `
                    <button data-order-id="${order.id}" class="btn btn-danger btn-sm delete-btn ml-2">
                        <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>`;
            }
            
            let currentStatusForCardDisplay = order.status;
             if (order.orderPhase === 'estimation') {
                currentStatusForCardDisplay = 'estimation'; 
            }

            return `
                <div class="card card-queue ${order.orderPhase ? 'phase-' + order.orderPhase : ''}">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h3 class="font-semibold text-gray-900">#${order.id.substring(0,5)} - ${order.clientName}</h3>
                            <span class="status-badge phase-${order.orderPhase || 'estimation'}">${getOrderPhaseText(order.orderPhase)}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            ${imageButtonHTML}
                            <span class="status-badge priority-${order.priority}">${(order.priority || 'normal').toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="space-y-2 text-sm text-gray-600">
                        <p><span class="font-medium">Itens:</span> ${itemCount} (${itemsSummary})</p>
                        <p><span class="font-medium">Criado em:</span> ${createdDateTimeFormatted}</p> <p><span class="font-medium">Início Produção (Pedido):</span> ${productionStartDateFormatted}</p>
                        <p><span class="font-medium">Entrega:</span> ${deliveryDateFormatted}</p>
                        <p><span class="font-medium">Status:</span> <span class="status-badge status-${currentStatusForCardDisplay}">${getStatusText(currentStatusForCardDisplay)}</span></p>
                        <p><span class="font-medium">Etapas:</span> ${order.selectedStages ? order.selectedStages.map(s => getStatusText(s)).join(', ') : 'N/A'}</p>
                    </div>
                    ${order.description ? `<div class="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700"><strong>Obs:</strong> ${order.description}</div>` : ''}
                    ${taskSpecificHTML}
                    <div class="mt-4 flex justify-end">
                        ${actionButtonHTML}
                    </div>
                </div>`;
        }

        function renderMyQueue() {
            console.log("[DEBUG] renderMyQueue chamada. UserProfile:", currentUserProfile);
            if (!myQueueTitleEl || !myQueueEstimationListEl || !myQueueProductionListEl || !currentUserProfile) {
                console.warn("[DEBUG] renderMyQueue: Elementos da UI ou perfil do usuário não encontrados. Saindo...");
                if(myQueueEstimationListEl) myQueueEstimationListEl.innerHTML = '<p class="text-gray-500">Faça login para ver sua fila.</p>';
                if(myQueueProductionListEl) myQueueProductionListEl.innerHTML = '';
                if(myQueueTitleEl) myQueueTitleEl.textContent = 'Minha Fila de Trabalho';
                return;
            }
            myQueueTitleEl.textContent = `Minha Fila de Trabalho (${currentUserProfile.name || currentUserProfile.email})`;

            const myQueueFilterValue = myQueueFilterInputEl ? myQueueFilterInputEl.value.toLowerCase().trim() : "";
            const userDepartments = currentUserProfile.departments || [];
            console.log("[DEBUG] renderMyQueue - User Departments:", userDepartments);

            let tasksForEstimationColumn = [];
            if (currentUserProfile.role !== MANAGER_ROLE) {
                tasksForEstimationColumn = allOrdersCache.filter(order => {
                    const isEstimationPhase = order.orderPhase === 'estimation';
                    const hasSelectedStages = order.selectedStages && order.selectedStages.length > 0;
                    if (!isEstimationPhase || !hasSelectedStages) return false;

                    return userDepartments.some(dept => 
                        order.selectedStages.includes(dept) &&
                        (!order.timeline[dept] || order.timeline[dept].estimatedMinutes === null)
                    );
                });
            }
            console.log("[DEBUG] renderMyQueue - Tarefas para Estimativa (antes do filtro de texto):", tasksForEstimationColumn.length);

            let tasksForProductionColumn = [];
            if (currentUserProfile.role === MANAGER_ROLE) {
                tasksForProductionColumn = allOrdersCache.filter(order => order.orderPhase === 'manager_review');
            } else { 
                tasksForProductionColumn = allOrdersCache.filter(order =>
                    order.orderPhase === 'production' &&
                    userDepartments.includes(order.status)
                );
            }
             console.log("[DEBUG] renderMyQueue - Tarefas para Produção/Revisão (antes do filtro de texto):", tasksForProductionColumn.length);
            
            if (myQueueFilterValue) {
                tasksForEstimationColumn = tasksForEstimationColumn.filter(order => 
                    (order.id.substring(0,5).toLowerCase().includes(myQueueFilterValue)) ||
                    (order.clientName && order.clientName.toLowerCase().includes(myQueueFilterValue))
                );
                tasksForProductionColumn = tasksForProductionColumn.filter(order => 
                     (order.id.substring(0,5).toLowerCase().includes(myQueueFilterValue)) ||
                    (order.clientName && order.clientName.toLowerCase().includes(myQueueFilterValue))
                );
            }
            
            myQueueEstimationListEl.innerHTML = tasksForEstimationColumn.length > 0 ? tasksForEstimationColumn.map(order => renderOrderCard(order)).join('') : `<p class="text-gray-500">Nenhum pedido aguardando sua estimativa ${myQueueFilterValue ? 'com o filtro "' + myQueueFilterValue + '"' : ''}.</p>`;
            myQueueProductionListEl.innerHTML = tasksForProductionColumn.length > 0 ? tasksForProductionColumn.map(order => renderOrderCard(order)).join('') : `<p class="text-gray-500">Nenhum pedido em produção ou para sua revisão ${myQueueFilterValue ? 'com o filtro "' + myQueueFilterValue + '"' : ''}.</p>`;
            
            document.querySelectorAll('.estimate-btn').forEach(btn => btn.addEventListener('click', () => handleEstimateSubmission(btn.dataset.orderId, btn.dataset.stageKey)));
            document.querySelectorAll('.prompt-prod-date-btn').forEach(btn => btn.addEventListener('click', () => promptForProductionStartDate(btn.dataset.orderId)));
            document.querySelectorAll('.advance-prod-btn').forEach(btn => btn.addEventListener('click', () => handleAdvanceProduction(btn.dataset.orderId)));
            document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => confirmDeleteOrder(btn.dataset.orderId)));
            document.querySelectorAll('.view-image-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); showImagePreviewModal(btn.dataset.imageUrl); }));
        }

        function renderTimeDashboard() {
            console.log("[DEBUG] renderTimeDashboard chamada");
            if (!timeDashboardContainerEl || !dashboardTitleEl) {console.warn("[DEBUG] Elementos do dashboard não encontrados."); return;}
            const filterValue = dashboardFilterInputEl ? dashboardFilterInputEl.value.toLowerCase().trim() : "";

            if (filterValue) {
                dashboardTitleEl.textContent = `Detalhes do Pedido (Filtro: ${filterValue})`;
                const filteredOrders = allOrdersCache.filter(order => 
                    (order.id.toLowerCase().includes(filterValue)) ||
                    (order.clientName && order.clientName.toLowerCase().includes(filterValue))
                );

                if (filteredOrders.length === 0) {
                    timeDashboardContainerEl.innerHTML = `<div class="card text-center col-span-full"><p class="text-gray-500">Nenhum pedido encontrado com o filtro "${filterValue}".</p></div>`;
                    return;
                }
                
                const order = filteredOrders[0]; 
                dashboardTitleEl.textContent = filteredOrders.length > 1 ? 
                    `Detalhes do Pedido (Filtro: ${filterValue}) - Mostrando o primeiro de ${filteredOrders.length}` :
                    `Detalhes do Pedido: #${order.id.substring(0,5)} - ${order.clientName}`;

                if (!order.timeline || !order.selectedStages) {
                    timeDashboardContainerEl.innerHTML = `<div class="card text-center col-span-full"><p class="text-gray-500">Este pedido não possui dados de tempo detalhados.</p></div>`;
                    return;
                }

                timeDashboardContainerEl.innerHTML = order.selectedStages.map(stageKey => {
                    const stageData = order.timeline[stageKey] || {};
                    const estimated = stageData.estimatedMinutes;
                    const actual = stageData.actualMinutes;
                    const difference = (typeof actual === 'number' && typeof estimated === 'number') ? actual - estimated : null;
                    let diffColorClass = 'text-gray-400';
                    let percentageDiffText = 'N/A';

                    if (typeof actual === 'number') { 
                        if (typeof estimated === 'number' && estimated > 0) {
                            if (difference > 0) diffColorClass = 'text-red-500';
                            else if (difference < 0) diffColorClass = 'text-green-500';
                            percentageDiffText = ((difference / estimated) * 100).toFixed(1) + '%';
                        } else if (typeof estimated !== 'number' && actual > 0) {
                             diffColorClass = 'text-yellow-500'; 
                             percentageDiffText = 'Sem Est.';
                        }
                    } else if (typeof estimated === 'number') { 
                        percentageDiffText = 'Pendente';
                    }

                    return `
                        <div class="card">
                            <h3 class="text-lg font-semibold text-brand mb-3">${getStatusTextForPDF(stageKey)}</h3>
                            <div class="space-y-2">
                                <p class="text-sm"><span class="text-gray-600">Estimado:</span> <span class="font-medium">${formatTime(estimated)}</span></p>
                                <p class="text-sm"><span class="text-gray-600">Real:</span> <span class="font-medium">${formatTime(actual)}</span></p>
                                ${typeof actual === 'number' || typeof estimated === 'number' ? `<p class="text-sm ${diffColorClass}"><span class="text-gray-600">Diferença:</span> ${formatTime(difference)} (${difference > 0 && typeof difference === 'number' ? '+' : ''}${percentageDiffText})</p>` : ''}
                            </div>
                        </div>`;
                }).join('');
                 if (order.selectedStages.length === 0) {
                    timeDashboardContainerEl.innerHTML = `<div class="card text-center col-span-full"><p class="text-gray-500">Nenhuma etapa selecionada para este pedido.</p></div>`;
                }

            } else {
                dashboardTitleEl.textContent = "Dashboard de Tempos por Etapa (Geral)";
                const timeDataByStage = ALL_POSSIBLE_STAGES.reduce((acc, stage) => { 
                    acc[stage.key] = { stageName: stage.name, totalEstimated: 0, totalActual: 0, count: 0 };
                    return acc;
                }, {});

                allOrdersCache.forEach(order => {
                    if (order.timeline && order.selectedStages) { 
                        order.selectedStages.forEach(stageKey => {
                            if (order.timeline[stageKey] && timeDataByStage[stageKey]) {
                                const stageDetail = order.timeline[stageKey];
                                if (typeof stageDetail.estimatedMinutes === 'number') timeDataByStage[stageKey].totalEstimated += stageDetail.estimatedMinutes;
                                if (typeof stageDetail.actualMinutes === 'number') {
                                    timeDataByStage[stageKey].totalActual += stageDetail.actualMinutes;
                                    timeDataByStage[stageKey].count++;
                                }
                            }
                        });
                    }
                });

                timeDashboardContainerEl.innerHTML = Object.values(timeDataByStage).map(data => {
                    const difference = data.totalActual - data.totalEstimated;
                    let diffColorClass = 'text-gray-500'; 
                    let percentageDiffText = '0%';
                    if (data.count > 0 && data.totalEstimated > 0) { 
                        if (difference > 0) diffColorClass = 'text-red-500'; 
                        else if (difference < 0) diffColorClass = 'text-green-500'; 
                        percentageDiffText = ((difference / data.totalEstimated) * 100).toFixed(1) + '%';
                    } else if (data.count > 0 && data.totalEstimated === 0 && data.totalActual > 0) {
                        diffColorClass = 'text-red-500'; percentageDiffText = 'N/A Est.';
                    } else if (data.count === 0 && data.totalEstimated > 0) {
                         percentageDiffText = 'Pendente Real';
                    }
                    return `
                        <div class="card">
                            <h3 class="text-xl font-semibold text-brand mb-4">${data.stageName}</h3>
                            <div class="space-y-3">
                                <p><span class="text-gray-600">Total Estimado:</span> <span class="font-semibold text-lg">${formatTime(data.totalEstimated)}</span></p>
                                <p><span class="text-gray-600">Total Real:</span> <span class="font-semibold text-lg">${formatTime(data.totalActual)}</span></p>
                                <p class="${diffColorClass}"><span class="text-gray-600">Diferença:</span> <span class="font-semibold">${formatTime(difference)} (${difference > 0 ? '+' : ''}${percentageDiffText})</span></p>
                            </div>
                        </div>`;
                }).join('');
                if (Object.keys(timeDataByStage).length === 0 || allOrdersCache.length === 0) {
                     timeDashboardContainerEl.innerHTML = '<div class="card text-center col-span-full"><p class="text-gray-500">Nenhum dado de tempo para exibir.</p></div>';
                }
            }
        }
        
        // CORREÇÃO 1: Função renderDailyProductionLoadReport corrigida
        function renderDailyProductionLoadReport() {
            console.log("[DEBUG] renderDailyProductionLoadReport chamada");
            if (!dailyLoadReportContainerEl || !calendarViewContainerEl) return;

            const activeOrders = allOrdersCache.filter(order => order.orderPhase !== 'completed');
            dailyLoadCache = {}; 

            // Processamento único para ambas as visualizações (lista e calendário)
            activeOrders.forEach(order => {
                if (order.deliveryDate && order.timeline && order.selectedStages) {
                    let orderTotalEstimatedTime = 0;
                    order.selectedStages.forEach(stageKey => {
                        const stageTimeline = order.timeline[stageKey];
                        if (stageTimeline && typeof stageTimeline.estimatedMinutes === 'number') {
                            if (order.orderPhase === 'estimation' || order.orderPhase === 'manager_review') {
                                orderTotalEstimatedTime += stageTimeline.estimatedMinutes;
                            } else if (order.orderPhase === 'production') {
                                const currentStageIndexInSelected = order.selectedStages.indexOf(order.status);
                                const thisStageIndexInSelected = order.selectedStages.indexOf(stageKey);
                                if (thisStageIndexInSelected >= currentStageIndexInSelected && typeof stageTimeline.actualMinutes !== 'number') {
                                     orderTotalEstimatedTime += stageTimeline.estimatedMinutes;
                                }
                            }
                        }
                    });

                    if (orderTotalEstimatedTime > 0) {
                        const dateKey = currentReportCalendarType === 'production' ? order.productionStartDate : order.deliveryDate;
                        if (dateKey) { 
                            if (!dailyLoadCache[dateKey]) {
                                dailyLoadCache[dateKey] = { totalTime: 0, orderCount: 0, orders: [] };
                            }
                            dailyLoadCache[dateKey].totalTime += orderTotalEstimatedTime;
                            dailyLoadCache[dateKey].orderCount++;
                            dailyLoadCache[dateKey].orders.push({ 
                                id: order.id,
                                clientName: order.clientName || "N/A",
                                estimatedTime: orderTotalEstimatedTime,
                                productionStartDate: order.productionStartDate || null,
                                deliveryDate: order.deliveryDate || null
                            });
                        }
                    }
                }
            });

            // Renderização da visualização em lista
            if (dailyLoadReportListContainerEl && !dailyLoadReportListContainerEl.classList.contains('hidden')) {
                const sortedDates = Object.keys(dailyLoadCache).sort((a,b) => new Date(a) - new Date(b));
                
                if (dailyLoadReportContainerEl) {
                    if (sortedDates.length === 0) {
                        dailyLoadReportContainerEl.innerHTML = '<div class="card text-center"><p class="text-gray-500">Nenhuma carga de produção futura encontrada.</p></div>';
                    } else {
                        dailyLoadReportContainerEl.innerHTML = sortedDates.map(dateKey => {
                            const data = dailyLoadCache[dateKey];
                            const ordersJson = JSON.stringify(data.orders).replace(/"/g, '&quot;');
                            return `
                                <div class="card cursor-pointer hover:shadow-md transition-shadow" onclick="showDailyLoadDetailsModal('${dateKey}', '${ordersJson}', '${currentReportCalendarType}')">
                                    <div class="flex justify-between items-center">
                                        <div>
                                            <h4 class="font-semibold text-gray-900">${formatDate(dateKey)}</h4>
                                            <p class="text-sm text-gray-600">${data.orderCount} pedido(s)</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-lg font-bold text-brand">${formatTime(data.totalTime)}</p>
                                            <p class="text-xs text-gray-500">carga estimada</p>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('');
                    }
                }
            }
            
            // Sempre renderizar o calendário também
            renderCalendarView(); 
        }

        function renderCalendarView() {
            if (!calendarViewContainerEl || !calendarMonthYearEl || !calendarDaysGridEl || !calendarDaysNamesEl) {
                console.error("[DEBUG] Elementos do calendário não encontrados.");
                return;
            }

            calendarMonthYearEl.textContent = currentCalendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            calendarDaysGridEl.innerHTML = ''; 

            if (calendarDaysNamesEl.children.length === 0) { 
                const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                dayNames.forEach(name => {
                    const dayNameDiv = document.createElement('div');
                    dayNameDiv.className = 'calendar-day-name';
                    dayNameDiv.textContent = name;
                    calendarDaysNamesEl.appendChild(dayNameDiv);
                });
            }
            
            const year = currentCalendarDate.getFullYear();
            const month = currentCalendarDate.getMonth();

            const firstDayOfMonth = new Date(year, month, 1);
            const lastDayOfMonth = new Date(year, month + 1, 0);
            const daysInMonth = lastDayOfMonth.getDate();
            const startDayOfWeek = firstDayOfMonth.getDay(); 

            for (let i = 0; i < startDayOfWeek; i++) {
                const emptyDayDiv = document.createElement('div');
                emptyDayDiv.className = 'calendar-day other-month';
                calendarDaysGridEl.appendChild(emptyDayDiv);
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dayDiv = document.createElement('div');
                dayDiv.className = 'calendar-day';
                
                const dayNumberSpan = document.createElement('span');
                dayNumberSpan.className = 'day-number';
                dayNumberSpan.textContent = day;
                dayDiv.appendChild(dayNumberSpan);

                const currentDateObj = new Date(year, month, day);
                const dateString = currentDateObj.toISOString().split('T')[0]; 

                if (dateString === new Date().toISOString().split('T')[0]) {
                    dayDiv.classList.add('today');
                }
                
                let dayLoadData;
                let ordersForThisDay = [];

                if (currentReportCalendarType === 'production') {
                    ordersForThisDay = allOrdersCache.filter(order => order.productionStartDate === dateString && order.orderPhase !== 'completed');
                } else { // 'delivery'
                    ordersForThisDay = allOrdersCache.filter(order => order.deliveryDate === dateString && order.orderPhase !== 'completed');
                }
                
                if (ordersForThisDay.length > 0) {
                    dayLoadData = {
                        totalTime: ordersForThisDay.reduce((sum, order) => {
                            let orderTime = 0;
                            if (order.timeline && order.selectedStages) {
                                order.selectedStages.forEach(stageKey => {
                                    const stageTimeline = order.timeline[stageKey];
                                    if (stageTimeline && typeof stageTimeline.estimatedMinutes === 'number') {
                                         if (order.orderPhase === 'estimation' || order.orderPhase === 'manager_review') {
                                            orderTime += stageTimeline.estimatedMinutes;
                                        } else if (order.orderPhase === 'production') {
                                            const currentStageIndexInSelected = order.selectedStages.indexOf(order.status);
                                            const thisStageIndexInSelected = order.selectedStages.indexOf(stageKey);
                                            if (thisStageIndexInSelected >= currentStageIndexInSelected && typeof stageTimeline.actualMinutes !== 'number') {
                                                orderTime += stageTimeline.estimatedMinutes;
                                            }
                                        }
                                    }
                                });
                            }
                            return sum + orderTime;
                        }, 0),
                        orderCount: ordersForThisDay.length,
                        orders: ordersForThisDay.map(o => ({ 
                            id: o.id, 
                            clientName: o.clientName || "N/A", 
                            estimatedTime: o.timeline && o.selectedStages ? o.selectedStages.reduce((sum, sk) => sum + (o.timeline[sk]?.estimatedMinutes || 0), 0) : 0,
                            productionStartDate: o.productionStartDate || null,
                            deliveryDate: o.deliveryDate || null
                        }))
                    };
                }


                if (dayLoadData && dayLoadData.orderCount > 0) {
                    dayDiv.classList.add('has-load');
                    const loadInfoSpan = document.createElement('span');
                    loadInfoSpan.className = 'load-info';
                    loadInfoSpan.textContent = `${formatTime(dayLoadData.totalTime)}`;
                    dayDiv.appendChild(loadInfoSpan);

                    dayDiv.addEventListener('click', () => {
                        showDailyLoadDetailsModal(dateString, dayLoadData.orders, currentReportCalendarType);
                    });
                }
                calendarDaysGridEl.appendChild(dayDiv);
            }

            const totalCells = startDayOfWeek + daysInMonth;
            const remainingCells = (7 - (totalCells % 7)) % 7;
            for (let i = 0; i < remainingCells; i++) {
                 const emptyDayDiv = document.createElement('div');
                emptyDayDiv.className = 'calendar-day other-month';
                calendarDaysGridEl.appendChild(emptyDayDiv);
            }
        }


        function renderCollaboratorsList() {
            console.log("[DEBUG] renderCollaboratorsList chamada");
            if (!collaboratorsListEl) {
                console.error("[DEBUG] collaboratorsListEl não encontrado");
                return;
            }

            if (!currentUserProfile || currentUserProfile.role !== MANAGER_ROLE) {
                collaboratorsListEl.innerHTML = '<p class="text-gray-500 text-sm italic">Apenas gerentes podem ver esta lista.</p>';
                return;
            }

            if (allCollaboratorsCache.length === 0) {
                collaboratorsListEl.innerHTML = '<p class="text-gray-500">Nenhum colaborador cadastrado.</p>';
                return;
            }

            collaboratorsListEl.innerHTML = allCollaboratorsCache.map(collab => {
                const departmentsText = collab.departments && collab.departments.length > 0 
                    ? collab.departments.map(dept => {
                        const stage = ALL_POSSIBLE_STAGES.find(s => s.key === dept);
                        return stage ? stage.name : dept;
                      }).join(', ') 
                    : 'Nenhum departamento';

                const roleText = collab.role === MANAGER_ROLE ? 'Gerente' : 'Colaborador';

                return `
                    <div class="card">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <h4 class="font-semibold text-gray-900">${collab.name || 'Nome não informado'}</h4>
                                <p class="text-sm text-gray-600">${collab.email}</p>
                                <div class="mt-2 space-y-1">
                                    <p class="text-xs"><span class="font-medium">Função:</span> ${roleText}</p>
                                    <p class="text-xs"><span class="font-medium">Departamentos:</span> ${departmentsText}</p>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="openEditCollaboratorModal('${collab.id}')" class="btn btn-secondary btn-icon" title="Editar">
                                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                </button>
                                <button onclick="deleteCollaborator('${collab.id}')" class="btn btn-danger btn-icon" title="Excluir">
                                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // 4. Funções de Manipulação de Dados e Ações
        function loadOrdersFromFirestore() {
            if (!ordersCollectionRef) { 
                console.warn("[DEBUG] loadOrdersFromFirestore: ordersCollectionRef não está definida. Isso é esperado se o usuário não estiver logado ou se o perfil não foi carregado.");
                hideLoading(); 
                return; 
            }
            console.log("[DEBUG] Tentando carregar pedidos do Firestore...");
            showLoading();
            if (unsubscribeOrders) unsubscribeOrders(); 

            unsubscribeOrders = onSnapshot(query(ordersCollectionRef), (querySnapshot) => { 
                console.log("[DEBUG] Recebido snapshot de pedidos, contagem:", querySnapshot.size);
                allOrdersCache = [];
                querySnapshot.forEach((doc) => {
                    allOrdersCache.push({ id: doc.id, ...doc.data() });
                });
                allOrdersCache.sort((a, b) => {
                    const priorityOrder = { urgente: 0, alta: 1, normal: 2 };
                    const priorityA = priorityOrder[a.priority] ?? 2;
                    const priorityB = priorityOrder[b.priority] ?? 2;
                    if (priorityA < priorityB) return -1;
                    if (priorityA > priorityB) return 1;
                    
                    const dateA = a.productionStartDate || a.deliveryDate;
                    const dateB = b.productionStartDate || b.deliveryDate;
                    return new Date(dateA) - new Date(dateB);
                });
                
                console.log("[DEBUG] Renderizando todas as tabelas e dashboards após carregar pedidos.");
                renderAllOrdersTable();
                renderMyQueue();
                if (currentUserProfile && currentUserProfile.role === MANAGER_ROLE) {
                    renderTimeDashboard(); 
                }
                renderDailyProductionLoadReport(); 
                if (currentUserProfile && currentUserProfile.role === MANAGER_ROLE) {
                    renderEstimatesControl();
                }
                hideLoading();
            }, (error) => {
                console.error("[DEBUG] Erro ao carregar pedidos do Firestore: ", error);
                showGenericModal("Erro de Carregamento", "Não foi possível buscar os pedidos do banco de dados.");
                hideLoading();
            });
        }
        
        function loadCollaborators() {
            console.log("[DEBUG] loadCollaborators chamada");
            console.log("[DEBUG] collaboratorsCollectionRef:", collaboratorsCollectionRef);
            console.log("[DEBUG] currentUserProfile:", currentUserProfile);
            
            if (!collaboratorsCollectionRef) {
                console.error("[DEBUG] collaboratorsCollectionRef não definida");
                if(collaboratorsListEl) collaboratorsListEl.innerHTML = '<p class="text-red-500 text-sm">Erro: Referência do banco não definida.</p>';
                return;
            }
            
            if (!currentUserProfile || currentUserProfile.role !== MANAGER_ROLE) {
                console.log("[DEBUG] Usuário não é gerente, não carregando colaboradores");
                if(collaboratorsListEl) collaboratorsListEl.innerHTML = '<p class="text-gray-500 text-sm italic">Apenas gerentes podem ver esta lista.</p>';
                return;
            }
            
            console.log("[DEBUG] Configurando listener para colaboradores...");
            
            if (unsubscribeCollaborators) {
                console.log("[DEBUG] Cancelando listener anterior de colaboradores");
                unsubscribeCollaborators();
            }

            try {
                unsubscribeCollaborators = onSnapshot(collaboratorsCollectionRef, 
                    (querySnapshot) => {
                        console.log("[DEBUG] Snapshot de colaboradores recebido");
                        console.log("[DEBUG] Número de colaboradores:", querySnapshot.size);
                        console.log("[DEBUG] Snapshot vazio?", querySnapshot.empty);
                        
                        allCollaboratorsCache = [];
                        querySnapshot.forEach((doc) => {
                            console.log("[DEBUG] Colaborador ID:", doc.id);
                            console.log("[DEBUG] Dados do colaborador:", doc.data());
                            allCollaboratorsCache.push({ id: doc.id, ...doc.data() });
                        });
                        
                        console.log("[DEBUG] Cache de colaboradores atualizado:", allCollaboratorsCache.length);
                        renderCollaboratorsList();
                    },
                    (error) => {
                        console.error("[DEBUG] Erro ao carregar colaboradores:", error);
                        console.error("[DEBUG] Código do erro:", error.code);
                        console.error("[DEBUG] Mensagem do erro:", error.message);
                        
                        if (collaboratorsListEl) {
                            let errorMessage = "Erro ao carregar colaboradores.";
                            if (error.code === 'permission-denied') {
                                errorMessage = "Sem permissão para ver colaboradores.";
                            }
                            collaboratorsListEl.innerHTML = `<p class="text-red-500 text-sm">${errorMessage}</p>`;
                        }
                    }
                );
            } catch (error) {
                console.error("[DEBUG] Erro ao configurar listener de colaboradores:", error);
                if (collaboratorsListEl) {
                    collaboratorsListEl.innerHTML = '<p class="text-red-500 text-sm">Erro de configuração.</p>';
                }
            }
        }

        window.openEditCollaboratorModal = function(collaboratorId) {
            if (!currentUserProfile || currentUserProfile.role !== MANAGER_ROLE) {
                showGenericModal("Acesso Negado", "Apenas gerentes podem editar colaboradores.");
                return;
            }
            const collab = allCollaboratorsCache.find(c => c.id === collaboratorId);
            if (!collab) {
                showGenericModal("Erro", "Colaborador não encontrado.");
                return;
            }

            if (editCollaboratorIdInputEl) editCollaboratorIdInputEl.value = collab.id;
            if (editCollabNameInputEl) editCollabNameInputEl.value = collab.name || '';
            if (editCollabEmailInputEl) editCollabEmailInputEl.value = collab.email || '';
            if (editCollabRoleSelectEl) {
                editCollabRoleSelectEl.value = collab.role || EMPLOYEE_ROLE;
                const managerCount = allCollaboratorsCache.filter(c => c.role === MANAGER_ROLE).length;
                if (collab.role === MANAGER_ROLE && managerCount <= 1 && collab.id === currentUserProfile.uid) { 
                    editCollabRoleSelectEl.disabled = true;
                } else {
                    editCollabRoleSelectEl.disabled = false;
                }
            }

            if (editCollabStagesCheckboxesEl) {
                editCollabStagesCheckboxesEl.innerHTML = ''; 
                ALL_POSSIBLE_STAGES.forEach(stage => {
                    const div = document.createElement('div');
                    div.className = 'flex items-center';
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `edit-collab-stage-${stage.key}`;
                    checkbox.name = 'editCollabSelectedStages';
                    checkbox.value = stage.key;
                    checkbox.className = 'form-checkbox mr-2';
                    if (collab.departments && collab.departments.includes(stage.key)) {
                        checkbox.checked = true;
                    }
                    const label = document.createElement('label');
                    label.htmlFor = `edit-collab-stage-${stage.key}`;
                    label.textContent = stage.name;
                    label.className = 'text-sm';
                    div.appendChild(checkbox);
                    div.appendChild(label);
                    editCollabStagesCheckboxesEl.appendChild(div);
                });
            }
            
            if (editCollaboratorModalEl) editCollaboratorModalEl.classList.remove('hidden');
        }

        window.closeEditCollaboratorModal = function() {
            if (editCollaboratorModalEl) editCollaboratorModalEl.classList.add('hidden');
        }

        async function handleUpdateCollaborator() {
            if (!currentUserProfile || currentUserProfile.role !== MANAGER_ROLE) {
                showGenericModal("Acesso Negado", "Apenas gerentes podem atualizar colaboradores.");
                return;
            }
            if (!editCollaboratorIdInputEl || !editCollabNameInputEl || !editCollabRoleSelectEl || !editCollabStagesCheckboxesEl) {
                 showGenericModal("Erro", "Elementos do formulário de edição não encontrados.");
                return;
            }

            const collaboratorId = editCollaboratorIdInputEl.value;
            const newName = editCollabNameInputEl.value.trim();
            const newRole = editCollabRoleSelectEl.value;
            const newSelectedDepartments = [];
            editCollabStagesCheckboxesEl.querySelectorAll('input[name="editCollabSelectedStages"]:checked').forEach(cb => {
                newSelectedDepartments.push(cb.value);
            });

            if (!newName) {
                showGenericModal("Erro de Validação", "O nome do colaborador não pode estar vazio.");
                return;
            }
            if (newRole === EMPLOYEE_ROLE && newSelectedDepartments.length === 0) {
                showGenericModal("Erro de Validação", "Colaboradores devem pertencer a pelo menos um departamento.");
                return;
            }

            const collaboratorBeingEdited = allCollaboratorsCache.find(c => c.id === collaboratorId);
            if (collaboratorBeingEdited && collaboratorBeingEdited.role === MANAGER_ROLE && newRole === EMPLOYEE_ROLE) {
                const managerCount = allCollaboratorsCache.filter(c => c.role === MANAGER_ROLE).length;
                if (managerCount <= 1 && collaboratorId === currentUserProfile.uid) { 
                    showGenericModal("Ação Não Permitida", "Você não pode alterar a função do único gerente para colaborador.");
                     if(editCollabRoleSelectEl) editCollabRoleSelectEl.value = MANAGER_ROLE; 
                    return;
                }
            }
            
            if (newRole === MANAGER_ROLE && !newSelectedDepartments.includes(MANAGER_REVIEW_STAGE_KEY)) {
                newSelectedDepartments.push(MANAGER_REVIEW_STAGE_KEY); 
            }


            const updateData = {
                name: newName,
                role: newRole,
                departments: newRole === MANAGER_ROLE ? [MANAGER_REVIEW_STAGE_KEY, ...ALL_POSSIBLE_STAGES.map(s => s.key)] : newSelectedDepartments
            };

            showLoading();
            try {
                const collabRef = doc(db, 'collaborators', collaboratorId);
                await updateDoc(collabRef, updateData);
                showToast(`Colaborador ${newName} atualizado.`, "success");
                closeEditCollaboratorModal();
            } catch (error) {
                console.error("Erro ao atualizar colaborador:", error);
                 if (error.code === 'permission-denied' || error.message.toLowerCase().includes('permission')) {
                    showGenericModal("Erro de Permissão", "Você não tem permissão para realizar esta alteração. Verifique as regras de segurança do Firestore ou contate o administrador.");
                } else {
                    showGenericModal("Erro", "Não foi possível atualizar o colaborador: " + error.message);
                }
            } finally {
                hideLoading();
            }
        }
        if(saveCollaboratorChangesBtnEl) saveCollaboratorChangesBtnEl.addEventListener('click', handleUpdateCollaborator);


        window.deleteCollaborator = function(collaboratorId) {
            const collab = allCollaboratorsCache.find(c => c.id === collaboratorId);
            if (!collab) return;
            
            if (collab.role === MANAGER_ROLE) {
                const managerCount = allCollaboratorsCache.filter(c => c.role === MANAGER_ROLE).length;
                if (managerCount <= 1) {
                    showGenericModal("Ação Não Permitida", "Não é possível excluir o único gerente do sistema.");
                    return;
                }
            }
            
            showGenericModal(
                "Confirmar Exclusão", 
                `Deseja excluir o colaborador <strong>${collab.name}</strong>?<br><small>Esta ação não pode ser desfeita.</small>`,
                [
                    { text: "Excluir", type: "danger", callback: () => deleteCollaboratorFromDb(collaboratorId) },
                    { text: "Cancelar", type: "secondary", callback: () => {} }
                ]
            );
        }

        async function deleteCollaboratorFromDb(collaboratorId) {
            if (!currentUserProfile || currentUserProfile.role !== MANAGER_ROLE) {
                showGenericModal("Acesso Negado", "Apenas gerentes podem excluir colaboradores.");
                return;
            }
            
            if (collaboratorId === currentUserProfile.uid) {
                showGenericModal("Erro", "Você não pode excluir sua própria conta.");
                return;
            }
            
            showLoading();
            try {
                const collabRef = doc(db, 'collaborators', collaboratorId);
                await deleteDoc(collabRef);
                showToast("Colaborador excluído.", "success");
            } catch (error) {
                console.error("Erro ao excluir colaborador:", error);
                showGenericModal("Erro", "Não foi possível excluir o colaborador: " + error.message);
            } finally {
                hideLoading();
            }
        }

        async function handleEstimateSubmission(orderId, stageKeyForEstimate) {
            const order = allOrdersCache.find(o => o.id === orderId);
            if (!order || order.orderPhase !== 'estimation' || !currentUserProfile || 
                !currentUserProfile.departments.includes(stageKeyForEstimate) || currentUserProfile.role === MANAGER_ROLE ) {
                 showGenericModal("Erro", "Não é possível submeter estimativa para este pedido/etapa agora ou você não tem permissão.");
                return;
            }

            const estimatedTimeInput = document.getElementById(`estTime-${order.id}-${stageKeyForEstimate}`);
            if (!estimatedTimeInput) {
                showGenericModal("Erro", "Campo de estimativa não encontrado.");
                return;
            }
            const estimatedMinutes = parseInt(estimatedTimeInput.value);

            if (isNaN(estimatedMinutes) || estimatedMinutes < 0) {
                showGenericModal("Erro", "Por favor, insira um tempo estimado válido para esta etapa.");
                return;
            }

            const timelineUpdate = { ...(order.timeline || {}) };
            if(!timelineUpdate[stageKeyForEstimate]) timelineUpdate[stageKeyForEstimate] = {};
            timelineUpdate[stageKeyForEstimate].estimatedMinutes = estimatedMinutes;
            timelineUpdate[stageKeyForEstimate].estimationSubmittedAt = new Date().toISOString();

            let allEstimatesSubmitted = true;
            for (const selectedStage of order.selectedStages) {
                if (!timelineUpdate[selectedStage] || timelineUpdate[selectedStage].estimatedMinutes === null) {
                    allEstimatesSubmitted = false;
                    break;
                }
            }
            
            let newOrderPhase = order.orderPhase;
            let newStatusForDB = order.status; 

            if (allEstimatesSubmitted) {
                newOrderPhase = 'manager_review';
                newStatusForDB = MANAGER_REVIEW_STAGE_KEY; 
            }
            
            showLoading();
            try {
                const orderRef = doc(ordersCollectionRef, orderId);
                await updateDoc(orderRef, { 
                    timeline: timelineUpdate,
                    status: newStatusForDB, 
                    orderPhase: newOrderPhase 
                });

                const employeeName = currentUserProfile.name.split(' ')[0];
                showToast(`Estimativa para ${getStatusTextForPDF(stageKeyForEstimate)} enviada.`, "success");

                // Notify manager(s) that an estimate was submitted
                const managers = allCollaboratorsCache.filter(c => c.role === MANAGER_ROLE);
                for (const manager of managers) {
                    await createNotification(
                        manager.id, 
                        `${employeeName} enviou estimativa para ${getStatusText(stageKeyForEstimate)} do pedido #${order.id.substring(0,5)} (${order.clientName}).`,
                        order.id,
                        'estimatesControl',
                        'estimate_submitted'
                    );
                }

                if (allEstimatesSubmitted) {
                    showToast(`Pedido #${order.id.substring(0,5)} pronto para revisão.`, "info");
                    for (const manager of managers) {
                        await createNotification(
                            manager.id, 
                            `Todas estimativas para o pedido #${order.id.substring(0,5)} (${order.clientName}) foram coletadas. Pronto para revisão.`,
                            order.id,
                            'myQueue', // Or 'estimatesControl'
                            'approval_needed'
                        );
                    }
                }
            } catch (error) {
                console.error("Erro ao enviar estimativa:", error);
                showGenericModal("Erro", "Não foi possível salvar a estimativa.");
            } finally {
                hideLoading();
            }
        }

        async function handleStartProduction(orderId, productionDate) {
            const order = allOrdersCache.find(o => o.id === orderId);
            if (!order || order.orderPhase !== 'manager_review' || !currentUserProfile || currentUserProfile.role !== MANAGER_ROLE) {
                 showGenericModal("Acesso Negado", "Apenas o Gerente de Produção pode iniciar a produção.");
                return;
            }

            if (!order.selectedStages || order.selectedStages.length === 0) {
                showGenericModal("Erro", "Nenhuma etapa de produção foi selecionada para este pedido.");
                return;
            }
            const firstProductionStageKey = order.selectedStages[0];
            const timelineUpdate = { ...(order.timeline || {}) };
            if(!timelineUpdate[firstProductionStageKey]) timelineUpdate[firstProductionStageKey] = {};
            
            showLoading();
            try {
                const orderRef = doc(ordersCollectionRef, orderId);
                await updateDoc(orderRef, {
                    orderPhase: 'production',
                    status: firstProductionStageKey, 
                    timeline: timelineUpdate, 
                    productionStartDate: productionDate 
                });
                
                showToast(`Produção do pedido #${order.id.substring(0,5)} iniciada.`, "success");

                // Notify employees responsible for the first stage
                const responsibleEmployees = allCollaboratorsCache.filter(c => 
                    c.role === EMPLOYEE_ROLE && c.departments && c.departments.includes(firstProductionStageKey)
                );
                for (const employee of responsibleEmployees) {
                    await createNotification(
                        employee.id,
                        `Pedido #${order.id.substring(0,5)} (${order.clientName}) atribuído a você para ${getStatusText(firstProductionStageKey)}.`,
                        order.id,
                        'myQueue',
                        'new_task'
                    );
                }

            } catch (error) {
                console.error("Erro ao iniciar produção:", error);
                showGenericModal("Erro", "Não foi possível iniciar a produção do pedido.");
            } finally {
                hideLoading();
            }
        }
        
        function promptForProductionStartDate(orderId) {
            const order = allOrdersCache.find(o => o.id === orderId);
            if (!order || order.orderPhase !== 'manager_review' || !currentUserProfile || currentUserProfile.role !== MANAGER_ROLE) {
                showGenericModal("Acesso Negado", "Ação não permitida.");
                return;
            }

            const today = new Date().toISOString().split('T')[0];

            showGenericModal(
                `Definir Início da Produção para Pedido #${order.id.substring(0,5)}`,
                null, 
                [
                    { 
                        text: "Confirmar e Iniciar Produção", 
                        type: "primary", 
                        callback: () => {
                            const dateInput = document.getElementById('productionStartDateInput');
                            if (!dateInput || !dateInput.value) {
                                showGenericModal("Erro", "Por favor, selecione uma data de início da produção.", [], 
                                `<p class="text-sm text-red-500 mb-2">Data inválida. Tente novamente.</p>`,
                                { closeOnClick: false } 
                                );
                                setTimeout(() => promptForProductionStartDate(orderId), 100); 
                                return false; 
                            }
                            const productionDate = dateInput.value;
                            handleStartProduction(orderId, productionDate); 
                        },
                        closeOnClick: true 
                    },
                    { text: "Cancelar", type: "secondary" }
                ],
                `<div class="space-y-4">
                    <p class="text-sm text-gray-700">Cliente: <span class="font-medium">${order.clientName}</span></p>
                    <div>
                        <label for="productionStartDateInput" class="block text-sm font-medium text-gray-700 mb-1">Data de Início da Produção:</label>
                        <input type="date" id="productionStartDateInput" class="form-input w-full" min="${today}">
                    </div>
                 </div>`
            );
        }

        async function handleAdvanceProduction(orderId) {
            console.log(`[DEBUG] handleAdvanceProduction clicado para orderId: ${orderId}`);
            const order = allOrdersCache.find(o => o.id === orderId);
            if (!order) {
                showGenericModal("Erro", "Pedido não encontrado.");
                return;
            }

            if (order.orderPhase !== 'production') {
                showGenericModal("Atenção", "Este pedido não está atualmente em fase de produção ativa.");
                return;
            }

            const currentStageKey = order.status;
            if (!currentUserProfile || !currentUserProfile.departments || !currentUserProfile.departments.includes(currentStageKey)) {
                showGenericModal("Acesso Negado", "Você não está atribuído para concluir esta etapa de produção.");
                return;
            }

            const stageTimeline = order.timeline[currentStageKey] || {};
            const now = new Date();
            let defaultStartDate = now.toISOString().split('T')[0];
            let defaultStartTime = now.toTimeString().substring(0, 5);

            if (stageTimeline.productionStartTime) {
                try {
                    const prevStartTime = new Date(stageTimeline.productionStartTime);
                    if (!isNaN(prevStartTime.getTime())) { 
                        defaultStartDate = prevStartTime.toISOString().split('T')[0];
                        defaultStartTime = prevStartTime.toTimeString().substring(0, 5);
                    } else {
                        console.warn(`[DEBUG] productionStartTime inválido para etapa ${currentStageKey} do pedido ${orderId}: ${stageTimeline.productionStartTime}`);
                    }
                } catch(e) {
                    console.warn(`[DEBUG] Erro ao parsear productionStartTime para etapa ${currentStageKey} do pedido ${orderId}: ${e}`);
                }
            }
            
            const defaultEndDate = now.toISOString().split('T')[0];
            const defaultEndTime = now.toTimeString().substring(0, 5);

            const modalBodyHTML = `
                <div class="space-y-4">
                    <div id="advanceProductionError" class="text-red-500 text-sm mb-3 hidden"></div>
                    <p class="text-sm text-gray-700">Concluindo etapa: <strong class="text-brand">${getStatusText(currentStageKey)}</strong> para Pedido <strong class="text-brand">#${order.id.substring(0,5)}</strong> (${order.clientName}).</p>
                    <div>
                        <label for="stageStartDateInput" class="block text-sm font-medium text-gray-700 mb-1">Data de Início da Etapa:</label>
                        <input type="date" id="stageStartDateInput" class="form-input w-full" value="${defaultStartDate}">
                    </div>
                    <div>
                        <label for="stageStartTimeInput" class="block text-sm font-medium text-gray-700 mb-1">Hora de Início da Etapa:</label>
                        <input type="time" id="stageStartTimeInput" class="form-input w-full" value="${defaultStartTime}">
                    </div>
                    <div>
                        <label for="stageEndDateInput" class="block text-sm font-medium text-gray-700 mb-1">Data de Término da Etapa:</label>
                        <input type="date" id="stageEndDateInput" class="form-input w-full" value="${defaultEndDate}">
                    </div>
                    <div>
                        <label for="stageEndTimeInput" class="block text-sm font-medium text-gray-700 mb-1">Hora de Término da Etapa:</label>
                        <input type="time" id="stageEndTimeInput" class="form-input w-full" value="${defaultEndTime}">
                    </div>
                </div>
            `;

            showGenericModal(
                `Concluir Etapa: ${getStatusText(currentStageKey)}`,
                null, 
                [
                    {
                        text: "Confirmar Conclusão",
                        type: "primary",
                        closeOnClick: false, 
                        callback: () => {
                            const errorDiv = document.getElementById('advanceProductionError');
                            if (errorDiv) errorDiv.classList.add('hidden'); 

                            const startDate = document.getElementById('stageStartDateInput').value;
                            const startTime = document.getElementById('stageStartTimeInput').value;
                            const endDate = document.getElementById('stageEndDateInput').value;
                            const endTime = document.getElementById('stageEndTimeInput').value;

                            if (!startDate || !startTime || !endDate || !endTime) {
                                if(errorDiv) {
                                    errorDiv.textContent = 'Todos os campos de data e hora devem ser preenchidos.';
                                    errorDiv.classList.remove('hidden');
                                }
                                return false; 
                            }
                            
                            const startDateTime = new Date(`${startDate}T${startTime}`);
                            const endDateTime = new Date(`${endDate}T${endTime}`);

                            if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
                                if(errorDiv) {
                                    errorDiv.textContent = 'As datas ou horas fornecidas são inválidas.';
                                    errorDiv.classList.remove('hidden');
                                }
                                return false; 
                            }

                            if (endDateTime <= startDateTime) {
                                if(errorDiv) {
                                    errorDiv.textContent = 'O horário de término deve ser posterior ao horário de início.';
                                    errorDiv.classList.remove('hidden');
                                }
                                return false; 
                            }
                            
                            advanceProductionStageOnDb(orderId, startDate, startTime, endDate, endTime);
                            closeGenericModal(); 
                            return true; 
                        }
                    },
                    { text: "Cancelar", type: "secondary", closeOnClick: true }
                ],
                modalBodyHTML
            );
        }

        async function advanceProductionStageOnDb(orderId, startDateString, startTimeString, endDateString, endTimeString) {
            const order = allOrdersCache.find(o => o.id === orderId);
            if (!order) {
                showGenericModal("Erro", "Pedido não encontrado para avançar etapa.");
                return;
            }

            const currentStageKey = order.status;
            const timelineUpdate = { ...order.timeline };
            
            const startDateTime = new Date(`${startDateString}T${startTimeString}`);
            const endDateTime = new Date(`${endDateString}T${endTimeString}`);

            // Validação já feita no handleAdvanceProduction, mas uma checagem rápida aqui não faz mal.
            if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime()) || endDateTime <= startDateTime) {
                showGenericModal("Erro de Dados", "Houve um problema com as datas/horas fornecidas ao tentar salvar.");
                return; 
            }

            const actualMilliseconds = endDateTime.getTime() - startDateTime.getTime();
            const actualMinutes = Math.round(actualMilliseconds / (1000 * 60));

            if (!timelineUpdate[currentStageKey]) timelineUpdate[currentStageKey] = {};

            timelineUpdate[currentStageKey].productionStartTime = startDateTime.toISOString();
            timelineUpdate[currentStageKey].productionEndTime = endDateTime.toISOString();
            timelineUpdate[currentStageKey].actualMinutes = actualMinutes;

            const currentStageIndexInSelected = order.selectedStages.indexOf(currentStageKey);
            let nextStatusKey = '';
            let newOrderPhase = order.orderPhase;

            if (currentStageIndexInSelected < order.selectedStages.length - 1) {
                nextStatusKey = order.selectedStages[currentStageIndexInSelected + 1];
                if(!timelineUpdate[nextStatusKey]) timelineUpdate[nextStatusKey] = {};
                // Não definir o productionStartTime da próxima etapa aqui, apenas se for explicitamente iniciado.
                // A notificação deve indicar que a próxima etapa está pronta para iniciar.
            } else { 
                nextStatusKey = COMPLETED_STAGE_KEY; 
                newOrderPhase = 'completed';
            }
            
            showLoading();
            try {
                const orderRef = doc(ordersCollectionRef, orderId);
                await updateDoc(orderRef, {
                    status: nextStatusKey, 
                    orderPhase: newOrderPhase,
                    timeline: timelineUpdate
                });
                showToast(`Etapa ${getStatusText(currentStageKey)} concluída para pedido #${order.id.substring(0,5)}.`, "success");

                if (newOrderPhase === 'completed') {
                    const managers = allCollaboratorsCache.filter(c => c.role === MANAGER_ROLE);
                    for (const manager of managers) {
                        await createNotification(
                            manager.id,
                            `Pedido #${order.id.substring(0,5)} (${order.clientName}) foi concluído!`,
                            order.id,
                            'allOrders',
                            'order_update'
                        );
                    }
                } else { 
                    const responsibleEmployees = allCollaboratorsCache.filter(c => 
                        c.role === EMPLOYEE_ROLE && c.departments && c.departments.includes(nextStatusKey)
                    );
                    for (const employee of responsibleEmployees) {
                        await createNotification(
                            employee.id,
                            `Pedido #${order.id.substring(0,5)} (${order.clientName}) aguarda sua ação na etapa ${getStatusText(nextStatusKey)}.`,
                            order.id,
                            'myQueue',
                            'new_task'
                        );
                    }
                    const managers = allCollaboratorsCache.filter(c => c.role === MANAGER_ROLE);
                    for (const manager of managers) {
                        await createNotification(
                            manager.id,
                            `Etapa ${getStatusText(currentStageKey)} concluída para #${order.id.substring(0,5)}. Próxima: ${getStatusText(nextStatusKey)}.`,
                            order.id,
                            'allOrders',
                            'order_update'
                        );
                    }
                }

            } catch (error) {
                console.error("Erro ao avançar etapa de produção:", error);
                showGenericModal("Erro", "Não foi possível avançar o pedido.");
            } finally {
                hideLoading();
            }
        }
        
        async function deleteSelectedOrdersFromDb() {
            if (selectedOrdersForDeletion.size === 0) {
                showGenericModal("Atenção", "Nenhum pedido selecionado para exclusão.");
                return;
            }

            showGenericModal(
                "Confirmar Exclusão em Massa",
                `Tem certeza que deseja excluir ${selectedOrdersForDeletion.size} pedido(s) selecionado(s)? Esta ação não pode ser desfeita.`,
                [
                    {
                        text: "Excluir Selecionados",
                        type: "danger",
                        callback: async () => {
                            showLoading();
                            let successCount = 0;
                            let errorCount = 0;
                            for (const orderId of selectedOrdersForDeletion) {
                                try {
                                    const orderRef = doc(ordersCollectionRef, orderId);
                                    await deleteDoc(orderRef);
                                    successCount++;
                                } catch (error) {
                                    console.error(`Erro ao excluir pedido ${orderId}:`, error);
                                    errorCount++;
                                }
                            }
                            hideLoading();
                            selectedOrdersForDeletion.clear();
                            toggleOrderSelectionMode(false); 
                            showToast(
                                `${successCount} pedido(s) excluído(s). ${errorCount > 0 ? errorCount + ' falha(s).' : ''}`,
                                errorCount > 0 ? "warning" : "success"
                            );
                        }
                    },
                    { text: "Cancelar", type: "secondary" }
                ]
            );
        }

        // CORREÇÃO 4: Função imageUrlToBase64 melhorada
        async function imageUrlToBase64(url) {
            if (!url || typeof url !== 'string' || !url.trim()) {
                console.warn("[DEBUG] URL da imagem inválida ou vazia fornecida para imageUrlToBase64:", url);
                return null; 
            }
            
            console.log(`[DEBUG] Tentando buscar imagem de: ${url}`);
            
            try {
                // Primeira tentativa: fetch direto
                const response = await fetch(url, { 
                    mode: 'cors',
                    method: 'GET',
                    headers: {
                        'Accept': 'image/*'
                    }
                }); 
                
                if (!response.ok) {
                    console.error(`[DEBUG] HTTP error ao buscar imagem: ${response.status} - ${response.statusText} para URL: ${url}`);
                    return null; 
                }
                
                const blob = await response.blob();
                
                // Verificar se é realmente uma imagem
                if (!blob.type.startsWith('image/')) {
                    console.warn(`[DEBUG] Arquivo não é uma imagem válida: ${blob.type}`);
                    return null;
                }
                
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result); 
                    reader.onerror = (error) => {
                        console.error(`[DEBUG] Erro do FileReader ao converter blob da imagem de ${url}:`, error);
                        reject(error); 
                    };
                    reader.readAsDataURL(blob);
                });
                
            } catch (error) { 
                console.error(`[DEBUG] Falha ao buscar imagem de ${url}. Erro: ${error.message}`, error);
                
                // Se for erro de CORS, retornar uma imagem placeholder
                if (error instanceof TypeError && error.message.toLowerCase().includes("failed to fetch")) {
                    console.warn(`[DEBUG] CORS error detectado para ${url}. A imagem não pôde ser carregada devido a restrições de segurança.`);
                    console.warn(`[DEBUG] SOLUÇÕES: 1) Configure CORS no servidor da imagem, 2) Use um proxy, 3) Hospede a imagem em um serviço que suporte CORS`);
                }
                
                return null; 
            }
        }

        window.generateOrderPDF = async function(orderId) { 
            const order = allOrdersCache.find(o => o.id === orderId);
            if (!order) {
                showGenericModal("Erro", "Pedido não encontrado para gerar PDF.");
                return;
            }
            showLoading();

            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            doc.setFont("Helvetica"); 

            let y = 15; 
            const lineHeight = 7;
            const itemLineHeight = 5; 
            const margin = 10;
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const usableWidth = pageWidth - 2 * margin;

            function checkAndAddPage(currentY, spaceNeeded = 20) {
                if (currentY > pageHeight - spaceNeeded) {
                    doc.addPage();
                    return 15; 
                }
                return currentY;
            }

            try { 
                if (COMPANY_LOGO_BASE64) { // Modificado para checar se não é null/undefined/string vazia
                    try {
                        let imageType = 'PNG'; 
                        if (COMPANY_LOGO_BASE64.startsWith('data:image/jpeg;base64,') || COMPANY_LOGO_BASE64.startsWith('data:image/jpg;base64,')) {
                            imageType = 'JPEG';
                        }
                        const logoWidth = 47; 
                        const logoHeight = 10; 
                        doc.addImage(COMPANY_LOGO_BASE64, imageType, margin, y, logoWidth, logoHeight);
                        y += logoHeight + 5; 
                    } catch (e) {
                        console.error("Erro ao adicionar logo da empresa ao PDF:", e);
                    }
                }

                doc.setFontSize(16);
                doc.text(`Detalhes do Pedido: #${order.id.substring(0,8)}`, margin, y);
                y += lineHeight * 1.5;

                doc.setFontSize(11);
                doc.text(`Cliente: ${order.clientName || 'N/A'}`, margin, y); y += lineHeight;
                doc.text(`Criado em: ${formatDateTime(order.createdAt)}`, margin, y); y += lineHeight; 
                if(order.productionStartDate) { 
                     doc.text(`Data de Início Produção: ${formatDate(order.productionStartDate)}`, margin, y); y += lineHeight;
                }
                doc.text(`Data de Entrega: ${formatDate(order.deliveryDate)}`, margin, y); y += lineHeight;
                doc.text(`Prioridade: ${(order.priority || 'normal').toUpperCase()}`, margin, y); y += lineHeight;
                
                if (order.coverImageUrl && order.coverImageUrl.trim() !== "") {
                    y = checkAndAddPage(y, 40); 
                    doc.setFontSize(10);
                    doc.text("Imagem de Referência:", margin, y);
                    y += itemLineHeight;
                    let imgData = null; 
                    try {
                        imgData = await imageUrlToBase64(order.coverImageUrl);
                        if (imgData) { 
                            const imgProps = doc.getImageProperties(imgData);
                            const imgWidth = usableWidth / 2; 
                            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
                            
                            y = checkAndAddPage(y, imgHeight + itemLineHeight); 

                            doc.addImage(imgData, imgProps.fileType.toUpperCase(), margin, y, imgWidth, imgHeight); 
                            y += imgHeight + itemLineHeight;
                        } else {
                            doc.text(`Falha ao carregar imagem: ${order.coverImageUrl}`, margin, y);
                            y += itemLineHeight;
                            doc.setFontSize(8);
                            doc.setTextColor(100); 
                            doc.text(`(Verifique URL, conexão e permissões CORS do servidor da imagem.)`, margin, y);
                            y += itemLineHeight * (doc.splitTextToSize(order.coverImageUrl, usableWidth).length);
                            doc.setTextColor(50,50,50); 
                            doc.setFontSize(10); 
                        }
                    } catch (e) { 
                        console.error("Erro ao processar ou adicionar imagem da capa ao PDF:", e);
                        doc.text(`Erro ao processar imagem: ${order.coverImageUrl}`, margin, y);
                        y += itemLineHeight;
                        doc.setFontSize(8);
                        doc.setTextColor(100);
                        doc.text(`(Verifique URL, conexão e permissões CORS do servidor da imagem.)`, margin, y);
                        y += itemLineHeight * (doc.splitTextToSize(order.coverImageUrl, usableWidth).length);
                        doc.setTextColor(50,50,50); 
                        doc.setFontSize(10); 
                    }
                } else {
                    y = checkAndAddPage(y, itemLineHeight + 2);
                    doc.setFontSize(10);
                    doc.text("Imagem de Referência: Nenhuma fornecida", margin, y);
                    y += itemLineHeight;
                }
                
                y += lineHeight * 0.5;
                y = checkAndAddPage(y, 60); 

                doc.setFontSize(12);
                doc.text("Itens do Pedido:", margin, y);
                y += lineHeight;
                doc.setFontSize(10);
                if (order.items && order.items.length > 0) {
                    order.items.forEach((item, index) => {
                        y = checkAndAddPage(y, itemLineHeight + 2);
                        doc.text(` Item ${index + 1}: ${item.quantity}x ${item.material} (${item.width}cm x ${item.height}cm)`, margin + 5, y);
                        y += itemLineHeight;
                    });
                } else {
                    doc.text("Nenhum item especificado.", margin + 5, y);
                    y += itemLineHeight;
                }
                y += lineHeight * 0.7;
                y = checkAndAddPage(y, 60); 

                doc.setFontSize(12);
                doc.text("Etapas Selecionadas para Produção:", margin, y);
                y += lineHeight;
                doc.setFontSize(10);
                if (order.selectedStages && order.selectedStages.length > 0) {
                    const stagesText = order.selectedStages.map(stageKey => getStatusTextForPDF(stageKey)).join(', ');
                    const stagesLines = doc.splitTextToSize(stagesText, usableWidth - 5); 
                    y = checkAndAddPage(y, stagesLines.length * itemLineHeight + 2);
                    doc.text(stagesLines, margin + 5, y);
                    y += stagesLines.length * itemLineHeight;
                } else {
                    doc.text("Nenhuma etapa de produção específica selecionada.", margin + 5, y);
                    y += itemLineHeight;
                }
                y += lineHeight * 0.7;
                

                if (order.description) {
                    doc.setFontSize(11);
                    doc.text("Observações Gerais (Pedido):", margin, y);
                    y += lineHeight * 0.8;
                    doc.setFontSize(10);
                    const descLines = doc.splitTextToSize(order.description, usableWidth - 5);
                    y = checkAndAddPage(y, descLines.length * lineHeight * 0.7 + lineHeight * 0.5 + 5);
                    doc.text(descLines, margin + 5, y);
                    y += descLines.length * lineHeight * 0.7 + lineHeight * 0.5;
                }
                
                y = checkAndAddPage(y, 80); 
                y += lineHeight; 

                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text("Controle de Qualidade", pageWidth / 2, y, { align: 'center' });
                doc.setFont(undefined, 'normal');
                y += lineHeight * 1.5;

                const qcItems = [
                    "Visual (impressão)",
                    "Resina (espessura/defeitos)",
                    "Corte (acabamento/borda)",
                    "Conferência de quantidade",
                    "Embalagem final"
                ];

                const colWidths = {
                    item: usableWidth * 0.35,      
                    responsavel: usableWidth * 0.20, 
                    ok: usableWidth * 0.08,         
                    nok: usableWidth * 0.08,        
                    observacoes: usableWidth * 0.29 
                };
                
                const cellPadding = 2;
                const headerLineHeight = itemLineHeight * 1.5; 
                const rowLineHeight = itemLineHeight * 2;   

                doc.setFontSize(9);
                doc.setFont(undefined, 'bold');
                let currentX = margin;
                doc.rect(currentX, y, colWidths.item, headerLineHeight); doc.text("Item", currentX + cellPadding, y + itemLineHeight);
                currentX += colWidths.item;
                doc.rect(currentX, y, colWidths.responsavel, headerLineHeight); doc.text("Responsável", currentX + cellPadding, y + itemLineHeight);
                currentX += colWidths.responsavel;
                doc.rect(currentX, y, colWidths.ok, headerLineHeight); doc.text("OK", currentX + cellPadding, y + itemLineHeight);
                currentX += colWidths.ok;
                doc.rect(currentX, y, colWidths.nok, headerLineHeight); doc.text("NOK", currentX + cellPadding, y + itemLineHeight);
                currentX += colWidths.nok;
                doc.rect(currentX, y, colWidths.observacoes, headerLineHeight); doc.text("Observações", currentX + cellPadding, y + itemLineHeight);
                y += headerLineHeight;
                doc.setFont(undefined, 'normal');
                doc.setFontSize(8);

                qcItems.forEach(item => {
                    y = checkAndAddPage(y, rowLineHeight + 2);
                    currentX = margin;
                    doc.rect(currentX, y, colWidths.item, rowLineHeight); 
                    const itemTextLines = doc.splitTextToSize(item, colWidths.item - 2 * cellPadding);
                    doc.text(itemTextLines, currentX + cellPadding, y + itemLineHeight - (itemTextLines.length > 1 ? 1 : 0) ); 
                    
                    currentX += colWidths.item;
                    doc.rect(currentX, y, colWidths.responsavel, rowLineHeight); 
                    currentX += colWidths.responsavel;
                    doc.rect(currentX, y, colWidths.ok, rowLineHeight);        
                    currentX += colWidths.ok;
                    doc.rect(currentX, y, colWidths.nok, rowLineHeight);       
                    currentX += colWidths.nok;
                    doc.rect(currentX, y, colWidths.observacoes, rowLineHeight); 
                    y += rowLineHeight;
                });

                y += lineHeight * 0.5;
                y = checkAndAddPage(y, 40); 

                doc.setFontSize(10);
                doc.text("Observações (preenchimento manual):", margin, y);
                y += itemLineHeight;
                const obsBoxHeight = itemLineHeight * 5; 
                doc.rect(margin, y, usableWidth, obsBoxHeight);
                for (let i = 1; i < 5; i++) {
                     doc.line(margin, y + (itemLineHeight * i), margin + usableWidth, y + (itemLineHeight*i));
                }
                y += obsBoxHeight + lineHeight;

                doc.save(`pedido_${order.id.substring(0,8)}_${(order.clientName || 'cliente').replace(/\s+/g, '_')}.pdf`);
                showToast("PDF do pedido gerado.", "success");

            } catch (pdfError) {
                console.error("Erro durante a geração do PDF:", pdfError);
                showGenericModal("Erro no PDF", "Ocorreu um erro inesperado ao gerar o PDF.");
            } finally {
                hideLoading();
            }
        }
        
        // --- Lógica de Autenticação e UI ---
        function updateUserAccessUI() {
            console.log("[DEBUG] updateUserAccessUI chamada. currentUserProfile:", currentUserProfile);
            if (!currentUserProfile || !navNewOrderBtnEl || !navUserManagementBtnEl || !navEstimatesControlBtnEl || !navDashboardBtnEl || !toggleOrderSelectionModeBtnEl || !deleteSelectedOrdersBtnEl || !calendarModeToggleContainerEl) {
                console.warn("[DEBUG] updateUserAccessUI: Perfil não carregado ou alguns botões de navegação/ação não encontrados.");
                if(navDashboardBtnEl) navDashboardBtnEl.style.display = 'none';
                if(navNewOrderBtnEl) navNewOrderBtnEl.style.display = 'none';
                if(navUserManagementBtnEl) navUserManagementBtnEl.style.display = 'none';
                if(navEstimatesControlBtnEl) navEstimatesControlBtnEl.style.display = 'none';
                if(toggleOrderSelectionModeBtnEl) toggleOrderSelectionModeBtnEl.classList.add('hidden');
                if(deleteSelectedOrdersBtnEl) deleteSelectedOrdersBtnEl.classList.add('hidden');
                if(calendarModeToggleContainerEl) calendarModeToggleContainerEl.classList.add('hidden');
                if(notificationBellContainerEl) notificationBellContainerEl.classList.add('hidden');


                if (appContentEl && !appContentEl.classList.contains('hidden') && loginSectionEl) {
                    console.log("[DEBUG] updateUserAccessUI: Escondendo appContent, mostrando loginSection.");
                    appContentEl.classList.add('hidden');
                    loginSectionEl.classList.remove('hidden');
                }
                return;
            }

            const isManager = currentUserProfile.role === MANAGER_ROLE;
            console.log("[DEBUG] updateUserAccessUI - isManager:", isManager);
            
            navDashboardBtnEl.style.display = isManager ? 'flex' : 'none'; 
            navNewOrderBtnEl.style.display = isManager ? 'flex' : 'none';
            navUserManagementBtnEl.style.display = isManager ? 'flex' : 'none';
            navEstimatesControlBtnEl.style.display = isManager ? 'flex' : 'none';
            calendarModeToggleContainerEl.classList.toggle('hidden', !isManager);
            
            toggleOrderSelectionModeBtnEl.classList.toggle('hidden', !isManager);
            deleteSelectedOrdersBtnEl.classList.add('hidden'); 
            deleteSelectedOrdersBtnEl.disabled = true;
            
            if(notificationBellContainerEl) notificationBellContainerEl.classList.remove('hidden');


            if (isManager && orderItemsContainerEl && document.getElementById('newOrderSection') && 
                document.getElementById('newOrderSection').classList.contains('active') && 
                orderItemsContainerEl.children.length === 0) {
                 console.log("[DEBUG] updateUserAccessUI: Adicionando primeiro item ao formulário de Novo Pedido.");
                 addOrderItem(true);
            }
        }

        onAuthStateChanged(auth, async (user) => {
            console.log("[DEBUG] onAuthStateChanged - user:", user ? user.uid : null);
            showLoading();
            if (user) {
                currentAuthUser = user;
                if (authUserIdGlobalEl) authUserIdGlobalEl.textContent = user.uid.substring(0,8) + "...";
                
                const userProfileRef = doc(db, `collaborators`, user.uid);
                try {
                    const userProfileSnap = await getDoc(userProfileRef);
                    if (userProfileSnap.exists()) {
                        currentUserProfile = { uid: user.uid, ...userProfileSnap.data() };
                        console.log("[DEBUG] Perfil do usuário carregado com sucesso:", currentUserProfile);
                        if(userNameDisplayEl) userNameDisplayEl.textContent = currentUserProfile.name || currentUserProfile.email;
                        if(userInfoEl) userInfoEl.classList.remove('hidden');
                        if(loginSectionEl) loginSectionEl.classList.add('hidden');
                        if(appContentEl) appContentEl.classList.remove('hidden');
                        
                        ordersCollectionRef = collection(db, `artifacts/${internalAppId}/production_orders`);
                        collaboratorsCollectionRef = collection(db, `collaborators`);
                        notificationsCollectionRef = collection(db, `notifications`); // Init notifications ref

                        updateUserAccessUI(); 
                        loadOrdersFromFirestore(); 
                        listenForNotifications(); // Start listening for notifications
                        if (currentUserProfile.role === MANAGER_ROLE) {
                            loadCollaborators(); 
                        }
                        
                        const activeNavAfterUIUpdate = document.querySelector('#mainNavigation button.nav-link.active');
                        if(!activeNavAfterUIUpdate){ 
                            if (currentUserProfile.role === MANAGER_ROLE) {
                                if (navDashboardBtnEl && navDashboardBtnEl.style.display !== 'none') {
                                    console.log("[DEBUG] onAuthStateChanged (Gerente): Nenhuma aba ativa, ativando Dashboard.");
                                    navDashboardBtnEl.click(); 
                                } else {
                                    const firstVisibleNav = document.querySelector('#mainNavigation button.nav-link:not([style*="display: none"])');
                                    if (firstVisibleNav) {
                                        console.log("[DEBUG] onAuthStateChanged (Gerente): Dashboard não visível, ativando primeira aba visível:", firstVisibleNav.dataset.section);
                                        firstVisibleNav.click();
                                    }
                                }
                            } else { 
                                if (navMyQueueBtnEl && navMyQueueBtnEl.style.display !== 'none') {
                                    console.log("[DEBUG] onAuthStateChanged (Colaborador): Nenhuma aba ativa, ativando Minha Fila.");
                                    navMyQueueBtnEl.click();
                                } else {
                                    const firstVisibleNav = document.querySelector('#mainNavigation button.nav-link:not([style*="display: none"])');
                                    if (firstVisibleNav) {
                                        console.log("[DEBUG] onAuthStateChanged (Colaborador): Minha Fila não visível, ativando primeira aba visível:", firstVisibleNav.dataset.section);
                                        firstVisibleNav.click();
                                    }
                                }
                            }
                             if (!document.querySelector('#mainNavigation button.nav-link.active')) {
                                console.error("[DEBUG] onAuthStateChanged: Nenhuma aba visível para ativar após login para o perfil:", currentUserProfile.role);
                            }
                        } else {
                            console.log("[DEBUG] onAuthStateChanged: Aba ativa já definida:", activeNavAfterUIUpdate.dataset.section);
                        }

                    } else {
                        console.warn("[DEBUG] Perfil do usuário não encontrado no Firestore para UID:", user.uid, ". Deslogando.");
                        if(auth) await signOut(auth); 
                    }
                } catch (error) {
                    console.error("[DEBUG] Erro ao buscar perfil do usuário:", error);
                    if(auth) await signOut(auth);
                }

            } else { 
                console.log("[DEBUG] Nenhum usuário logado. Mostrando tela de login.");
                currentAuthUser = null;
                currentUserProfile = null;
                if(userNameDisplayEl) userNameDisplayEl.textContent = '';
                if(userInfoEl) userInfoEl.classList.add('hidden');
                if(loginSectionEl) loginSectionEl.classList.remove('hidden');
                if(appContentEl) appContentEl.classList.add('hidden');
                if (authUserIdGlobalEl) authUserIdGlobalEl.textContent = "N/A";
                
                // CORREÇÃO 6: Limpeza de recursos adicionada
                cleanupResources();
                
                // Renderizar tabelas vazias
                if(allOrdersTableBodyEl) renderAllOrdersTable(); 
                if(myQueueEstimationListEl && myQueueProductionListEl && myQueueTitleEl) renderMyQueue();
                if(timeDashboardContainerEl && dashboardTitleEl) renderTimeDashboard();
                if(dailyLoadReportContainerEl) renderDailyProductionLoadReport();
                if(notificationBellContainerEl) notificationBellContainerEl.classList.add('hidden');
                if(notificationDropdownEl) notificationDropdownEl.classList.add('hidden');
            }
            hideLoading();
        });

        // --- Event Listeners ---
        if (loginFormEl) {
            loginFormEl.addEventListener('submit', async (e) => {
                e.preventDefault();
                showLoading();
                if(loginErrorEl) loginErrorEl.classList.add('hidden');
                const email = loginFormEl.loginEmail.value;
                const password = loginFormEl.loginPassword.value;
                try {
                    await signInWithEmailAndPassword(auth, email, password);
                    console.log("[DEBUG] Tentativa de login bem-sucedida para:", email);
                    showToast(`Bem-vindo de volta!`, "success");
                } catch (error) {
                    console.error("[DEBUG] Erro no login:", error.code, error.message);
                    if(loginErrorEl) {
                        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                            loginErrorEl.textContent = "Email ou senha inválidos. Verifique seus dados.";
                        } else {
                            loginErrorEl.textContent = "Falha no login: " + error.message; 
                        }
                        loginErrorEl.classList.remove('hidden');
                    }
                     showToast("Falha no login.", "error");
                } finally {
                    hideLoading();
                }
            });
        }

        // CORREÇÃO 5: Event listener do logout melhorado
        if (logoutBtnEl) {
            logoutBtnEl.addEventListener('click', async () => {
                console.log("[DEBUG] LogoutBtn clicado");
                showLoading();
                try {
                    // Limpar recursos antes do logout
                    cleanupResources();
                    
                    // Fazer logout do Firebase
                    await signOut(auth);
                    showToast("Você saiu do sistema.", "info");
                } catch (error) {
                    console.error("[DEBUG] Erro no logout:", error);
                    showGenericModal("Erro", "Falha ao fazer logout.");
                } finally {
                    hideLoading();
                }
            });
        }
        
        if (collabStagesCheckboxesEl) { 
            ALL_POSSIBLE_STAGES.forEach(stage => {
                const div = document.createElement('div');
                div.className = 'flex items-center';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `collab-stage-${stage.key}`;
                checkbox.name = 'collabSelectedStages';
                checkbox.value = stage.key;
                checkbox.className = 'form-checkbox mr-2';
                const label = document.createElement('label');
                label.htmlFor = `collab-stage-${stage.key}`;
                label.textContent = stage.name;
                label.className = 'text-sm';
                div.appendChild(checkbox);
                div.appendChild(label);
                collabStagesCheckboxesEl.appendChild(div);
            });
        }

        if(addCollaboratorFormEl) {
            addCollaboratorFormEl.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log("[DEBUG] Formulário de adicionar colaborador submetido.");
                if (!currentUserProfile || currentUserProfile.role !== MANAGER_ROLE) {
                    showGenericModal("Acesso Negado", "Apenas gerentes podem adicionar colaboradores.");
                    return;
                }

                const name = addCollaboratorFormEl.collabName.value;
                const email = addCollaboratorFormEl.collabEmail.value;
                const password = addCollaboratorFormEl.collabPassword.value;
                const role = addCollaboratorFormEl.collabRole.value;
                const selectedDepartments = [];
                collabStagesCheckboxesEl.querySelectorAll('input[name="collabSelectedStages"]:checked').forEach(cb => {
                    selectedDepartments.push(cb.value);
                });

                if (password.length < 6) {
                    showGenericModal("Erro", "A senha inicial deve ter pelo menos 6 caracteres.");
                    return;
                }
                if (selectedDepartments.length === 0 && role === EMPLOYEE_ROLE) {
                    showGenericModal("Atenção", "Selecione pelo menos um departamento para o colaborador.");
                    return;
                }
                
                showLoading();
                try {
                    console.log("[DEBUG] Tentando criar utilizador no Auth:", email);
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const newUserId = userCredential.user.uid;
                    console.log("[DEBUG] Utilizador criado no Auth com UID:", newUserId);

                    console.log("[DEBUG] Tentando criar perfil no Firestore para UID:", newUserId);
                    await setDoc(doc(db, 'collaborators', newUserId), {
                        name: name,
                        email: email,
                        role: role,
                        departments: role === MANAGER_ROLE ? [MANAGER_REVIEW_STAGE_KEY, ...ALL_POSSIBLE_STAGES.map(s => s.key)] : selectedDepartments,
                        uid: newUserId 
                    });
                    console.log("[DEBUG] Perfil criado no Firestore para:", name);

                    addCollaboratorFormEl.reset();
                    collabStagesCheckboxesEl.querySelectorAll('input').forEach(cb => cb.checked = false);
                    showToast(`Colaborador ${name} adicionado.`, "success");
                    loadCollaborators(); 
                } catch (error) {
                    console.error("Erro ao adicionar colaborador:", error.code, error.message);
                    showGenericModal("Erro", `Não foi possível adicionar o colaborador: ${error.message}`);
                } finally {
                    hideLoading();
                }
            });
        }
        
        if (orderFormEl) {
            orderFormEl.addEventListener('submit', async function(e) {
                e.preventDefault();
                if (!currentUserProfile || currentUserProfile.role !== MANAGER_ROLE) {
                    showGenericModal("Acesso Negado", "Apenas gerentes podem criar pedidos.");
                    return;
                }
                
                const selectedStagesKeys = [];
                productionStagesCheckboxesEl.querySelectorAll('input[name="selectedStages"]:checked').forEach(checkbox => {
                    selectedStagesKeys.push(checkbox.value);
                });

                if (selectedStagesKeys.length === 0) {
                    showGenericModal("Atenção", "Por favor, selecione pelo menos uma etapa de produção para o pedido geral.");
                    return;
                }

                const items = [];
                const itemCards = orderItemsContainerEl.querySelectorAll('.card');
                if (itemCards.length === 0) {
                    showGenericModal("Atenção", "Adicione pelo menos um item ao pedido.");
                    return;
                }

                let itemsValid = true;
                itemCards.forEach(card => {
                    const material = card.querySelector('input[name="item_material"]').value;
                    const quantity = parseInt(card.querySelector('input[name="item_quantity"]').value);
                    const width = parseFloat(card.querySelector('input[name="item_width"]').value);
                    const height = parseFloat(card.querySelector('input[name="item_height"]').value);
                    if (!material || isNaN(quantity) || quantity <=0 || isNaN(width) || width <=0 || isNaN(height) || height <=0) {
                        itemsValid = false;
                    }
                    items.push({ material, quantity, width, height });
                });

                if (!itemsValid) {
                    showGenericModal("Erro nos Itens", "Verifique se todos os campos dos itens (material, quantidade, largura, altura) estão preenchidos corretamente.");
                    return;
                }

                const orderData = {
                    clientName: document.getElementById('clientName').value,
                    deliveryDate: document.getElementById('deliveryDate').value,
                    productionStartDate: null, 
                    priority: document.getElementById('priority').value,
                    coverImageUrl: document.getElementById('coverImageUrl').value.trim(),
                    description: document.getElementById('description').value, 
                    selectedStages: selectedStagesKeys, 
                    items: items, 
                    status: 'estimation', 
                    orderPhase: 'estimation', 
                    createdAt: new Date().toISOString(),
                    createdBy: { uid: currentUserProfile.uid, name: currentUserProfile.name || currentUserProfile.email },
                    appId: internalAppId,
		            timeline: ALL_POSSIBLE_STAGES.reduce((acc, stage) => {
                        acc[stage.key] = { 
                            estimatedMinutes: null, estimationSubmittedAt: null,
                            productionStartTime: null, actualMinutes: null, productionEndTime: null 
                        };
                        return acc;
                    }, {}),
                };

                showLoading();
                try {
                    const newOrderRef = await addDoc(ordersCollectionRef, orderData);
                    const newOrderId = newOrderRef.id;

                    this.reset(); 
                    if (orderItemsContainerEl) { 
                        orderItemsContainerEl.innerHTML = '';
                        addOrderItem(true);
                    }
                    productionStagesCheckboxesEl.querySelectorAll('input').forEach(cb => cb.checked = false);
                    const deliveryDateInput = document.getElementById('deliveryDate');
                    if(deliveryDateInput) deliveryDateInput.min = new Date().toISOString().split("T")[0];
                    
                    showToast(`Pedido para ${orderData.clientName} criado.`, "success");

                    const employeesToNotify = new Set();
                    orderData.selectedStages.forEach(stageKey => {
                        allCollaboratorsCache.forEach(collab => {
                            if (collab.role === EMPLOYEE_ROLE && collab.departments && collab.departments.includes(stageKey)) {
                                employeesToNotify.add(collab.id);
                            }
                        });
                    });

                    employeesToNotify.forEach(employeeId => {
                        createNotification(
                            employeeId,
                            `Novo pedido #${newOrderId.substring(0,5)} (${orderData.clientName}) requer sua estimativa.`,
                            newOrderId,
                            'myQueue',
                            'estimate_needed'
                        );
                    });
                    const managers = allCollaboratorsCache.filter(c => c.role === MANAGER_ROLE);
                     for (const manager of managers) {
                        await createNotification(
                            manager.id, 
                            `Novo pedido #${newOrderId.substring(0,5)} (${orderData.clientName}) criado e aguardando estimativas.`,
                            newOrderId,
                            'estimatesControl', 
                            'order_update'
                        );
                    }


                } catch (error) {
                    console.error("Erro ao adicionar pedido: ", error);
                    showGenericModal('Erro Inesperado', 'Não foi possível adicionar o pedido.');
                } finally {
                    hideLoading();
                }
            });
        }
        
        if (productionStagesCheckboxesEl) { 
            ALL_POSSIBLE_STAGES.forEach(stage => {
                const div = document.createElement('div');
                div.className = 'flex items-center';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `stage-${stage.key}`;
                checkbox.name = 'selectedStages';
                checkbox.value = stage.key;
                checkbox.className = 'form-checkbox mr-2';
                const label = document.createElement('label');
                label.htmlFor = `stage-${stage.key}`;
                label.textContent = stage.name;
                label.className = 'text-sm';
                div.appendChild(checkbox);
                div.appendChild(label);
                productionStagesCheckboxesEl.appendChild(div);
            });
        }

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                console.log("[DEBUG] Nav link clicado:", link.dataset.section); 

                if (link.id === 'navNewOrderBtn' && (!currentUserProfile || currentUserProfile.role !== MANAGER_ROLE)) {
                    showGenericModal("Acesso Negado", "Apenas o Gerente de Produção pode criar novos pedidos.");
                    console.log("[DEBUG] Acesso negado para Novo Pedido"); 
                    return; 
                }
                if (link.id === 'navUserManagementBtn' && (!currentUserProfile || currentUserProfile.role !== MANAGER_ROLE)) {
                    showGenericModal("Acesso Negado", "Apenas o Gerente de Produção pode gerir colaboradores.");
                    console.log("[DEBUG] Acesso negado para Gestão de Colaboradores"); 
                    return;
                }
                if (link.id === 'navEstimatesControlBtn' && (!currentUserProfile || currentUserProfile.role !== MANAGER_ROLE)) {
                    showGenericModal("Acesso Negado", "Apenas o Gerente de Produção pode acessar o controle de estimativas.");
                    console.log("[DEBUG] Acesso negado para Controle de Estimativas"); 
                    return;
                }
                 if (link.id === 'navDashboardBtn' && (!currentUserProfile || currentUserProfile.role !== MANAGER_ROLE)) {
                    showGenericModal("Acesso Negado", "Apenas gerentes podem acessar o Dashboard.");
                    console.log("[DEBUG] Acesso negado para Dashboard (Colaborador)");
                    return; 
                }


                const sectionId = link.dataset.section + "Section";
                console.log("[DEBUG] Tentando ativar seção ID:", sectionId); 

                sections.forEach(section => section.classList.add('hidden'));
                navLinks.forEach(nav => nav.classList.remove('active'));
                
                const targetSection = document.getElementById(sectionId);
                if (targetSection) {
                    targetSection.classList.remove('hidden');
                    console.log("[DEBUG] Seção exibida:", sectionId); 
                } else {
                    console.error("[DEBUG] Seção não encontrada:", sectionId); 
                }
                link.classList.add('active');

                if (isOrderSelectionModeActive && sectionId !== 'allOrdersSection') {
                    toggleOrderSelectionMode(false); 
                } else if (sectionId === 'allOrdersSection') {
                    renderAllOrdersTable();
                }


                if (sectionId === 'dashboardSection' && currentUserProfile && currentUserProfile.role === MANAGER_ROLE) { console.log("[DEBUG] Chamando renderTimeDashboard"); renderTimeDashboard(); } 
                if (sectionId === 'estimatesControlSection' && currentUserProfile && currentUserProfile.role === MANAGER_ROLE) { 
                    console.log("[DEBUG] Chamando renderEstimatesControl"); 
                    renderEstimatesControl(); 
                }
                if (sectionId === 'reportsSection') { 
                    console.log("[DEBUG] Chamando renderDailyProductionLoadReport (para lista e dados do calendário)"); 
                    renderDailyProductionLoadReport(); 
                    if(dailyLoadReportListContainerEl) dailyLoadReportListContainerEl.classList.remove('hidden');
                    if(calendarViewContainerEl) calendarViewContainerEl.classList.add('hidden');
                    if(reportViewListBtnEl) reportViewListBtnEl.classList.add('btn-primary');
                    if(reportViewListBtnEl) reportViewListBtnEl.classList.remove('btn-secondary');
                    if(reportViewCalendarBtnEl) reportViewCalendarBtnEl.classList.remove('btn-primary');
                    if(reportViewCalendarBtnEl) reportViewCalendarBtnEl.classList.add('btn-secondary');
                    if(calendarModeToggleContainerEl) calendarModeToggleContainerEl.classList.add('hidden'); 
                } 
                if (sectionId === 'newOrderSection' && orderItemsContainerEl && orderItemsContainerEl.children.length === 0 && currentUserProfile && currentUserProfile.role === MANAGER_ROLE) {
                    console.log("[DEBUG] Adicionando primeiro item ao novo pedido"); addOrderItem(true); 
                }
                if (sectionId === 'myQueueSection') { console.log("[DEBUG] Chamando renderMyQueue"); renderMyQueue(); } 
                if (sectionId === 'userManagementSection' && currentUserProfile && currentUserProfile.role === MANAGER_ROLE) { 
                    console.log("[DEBUG] Navegando para Gestão de Colaboradores");
                    console.log("[DEBUG] Forçando carregamento de colaboradores");
                    loadCollaborators(); 
                } 
            });
        });

        if (addOrderItemBtnEl) {
            addOrderItemBtnEl.addEventListener('click', () => addOrderItem(false));
        }

        if (orderFilterInputEl) orderFilterInputEl.addEventListener('keyup', renderAllOrdersTable);
        if (clearOrderFilterBtnEl) clearOrderFilterBtnEl.addEventListener('click', () => {
            if (orderFilterInputEl) orderFilterInputEl.value = '';
            renderAllOrdersTable(); 
        });
        if (dashboardFilterInputEl) dashboardFilterInputEl.addEventListener('keyup', renderTimeDashboard);
        if (clearDashboardFilterBtnEl) clearDashboardFilterBtnEl.addEventListener('click', () => {
            if (dashboardFilterInputEl) dashboardFilterInputEl.value = '';
            renderTimeDashboard();
        });
        if (myQueueFilterInputEl) myQueueFilterInputEl.addEventListener('keyup', renderMyQueue); 
        if (clearMyQueueFilterBtnEl) clearMyQueueFilterBtnEl.addEventListener('click', () => {
            if (myQueueFilterInputEl) myQueueFilterInputEl.value = '';
            renderMyQueue();
        });
        if (estimatesControlFilterInputEl) estimatesControlFilterInputEl.addEventListener('keyup', renderEstimatesControl);
        if (clearEstimatesControlFilterBtnEl) clearEstimatesControlFilterBtnEl.addEventListener('click', () => {
            if (estimatesControlFilterInputEl) estimatesControlFilterInputEl.value = '';
            renderEstimatesControl();
        });

        if(reportViewListBtnEl) {
            reportViewListBtnEl.addEventListener('click', () => {
                if(dailyLoadReportListContainerEl) dailyLoadReportListContainerEl.classList.remove('hidden');
                if(calendarViewContainerEl) calendarViewContainerEl.classList.add('hidden');
                reportViewListBtnEl.classList.add('btn-primary');
                reportViewListBtnEl.classList.remove('btn-secondary');
                if(reportViewCalendarBtnEl) reportViewCalendarBtnEl.classList.remove('btn-primary');
                if(reportViewCalendarBtnEl) reportViewCalendarBtnEl.classList.add('btn-secondary');
                if(calendarModeToggleContainerEl) calendarModeToggleContainerEl.classList.add('hidden'); 
                renderDailyProductionLoadReport(); 
            });
        }
        if(reportViewCalendarBtnEl) {
            reportViewCalendarBtnEl.addEventListener('click', () => {
                if(dailyLoadReportListContainerEl) dailyLoadReportListContainerEl.classList.add('hidden');
                if(calendarViewContainerEl) calendarViewContainerEl.classList.remove('hidden');
                reportViewCalendarBtnEl.classList.add('btn-primary');
                reportViewCalendarBtnEl.classList.remove('btn-secondary');
                if(reportViewListBtnEl) reportViewListBtnEl.classList.remove('btn-primary');
                if(reportViewListBtnEl) reportViewListBtnEl.classList.add('btn-secondary');
                if(calendarModeToggleContainerEl && currentUserProfile && currentUserProfile.role === MANAGER_ROLE) {
                     calendarModeToggleContainerEl.classList.remove('hidden'); 
                }
                renderCalendarView(); 
            });
        }
        if(prevMonthBtnEl) {
            prevMonthBtnEl.addEventListener('click', () => {
                currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
                renderCalendarView();
            });
        }
        if(nextMonthBtnEl) {
            nextMonthBtnEl.addEventListener('click', () => {
                currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
                renderCalendarView();
            });
        }
         if(calendarModeDeliveryBtnEl) {
            calendarModeDeliveryBtnEl.addEventListener('click', () => {
                currentReportCalendarType = 'delivery';
                calendarModeDeliveryBtnEl.classList.add('btn-primary');
                calendarModeDeliveryBtnEl.classList.remove('btn-secondary');
                if(calendarModeProductionBtnEl) calendarModeProductionBtnEl.classList.remove('btn-primary');
                if(calendarModeProductionBtnEl) calendarModeProductionBtnEl.classList.add('btn-secondary');
                renderCalendarView();
            });
        }
        if(calendarModeProductionBtnEl) {
            calendarModeProductionBtnEl.addEventListener('click', () => {
                currentReportCalendarType = 'production';
                calendarModeProductionBtnEl.classList.add('btn-primary');
                calendarModeProductionBtnEl.classList.remove('btn-secondary');
                if(calendarModeDeliveryBtnEl) calendarModeDeliveryBtnEl.classList.remove('btn-primary');
                if(calendarModeDeliveryBtnEl) calendarModeDeliveryBtnEl.classList.add('btn-secondary');
                renderCalendarView();
            });
        }

        // Notification Bell Listeners
        if (notificationBellBtnEl) {
            notificationBellBtnEl.addEventListener('click', (e) => {
                e.stopPropagation(); 
                if (notificationDropdownEl) notificationDropdownEl.classList.toggle('hidden');
            });
        }
        if (markAllNotificationsReadBtnEl) {
            markAllNotificationsReadBtnEl.addEventListener('click', (e) => {
                e.stopPropagation();
                markAllNotificationsAsRead();
            });
        }
        if (notificationListEl) {
            notificationListEl.addEventListener('click', (e) => {
                const item = e.target.closest('.notification-item');
                if (item) {
                    e.stopPropagation();
                    const notificationId = item.dataset.id;
                    const orderId = item.dataset.orderId;
                    const sectionTarget = item.dataset.section;

                    markNotificationAsRead(notificationId);
                    if (notificationDropdownEl) notificationDropdownEl.classList.add('hidden');

                    if (sectionTarget) {
                        const navButton = document.querySelector(`.nav-link[data-section="${sectionTarget}"]`);
                        if (navButton) navButton.click();
                    }
                    if (sectionTarget === 'allOrders' && orderId) {
                         if(orderFilterInputEl) orderFilterInputEl.value = orderId.substring(0,5);
                         renderAllOrdersTable();
                    } else if (sectionTarget === 'myQueue' && orderId) {
                        if(myQueueFilterInputEl) myQueueFilterInputEl.value = orderId.substring(0,5);
                        renderMyQueue();
                    } else if (sectionTarget === 'estimatesControl' && orderId) {
                         if(estimatesControlFilterInputEl) estimatesControlFilterInputEl.value = orderId.substring(0,5);
                        renderEstimatesControl();
                    }
                }
            });
        }
        document.body.addEventListener('click', (e) => {
            if (notificationDropdownEl && !notificationDropdownEl.classList.contains('hidden')) {
                if (!notificationBellContainerEl.contains(e.target)) {
                    notificationDropdownEl.classList.add('hidden');
                }
            }
        });


        window.openOrderDetailsReportModal = async function(orderId) {
            const order = allOrdersCache.find(o => o.id === orderId);
            if (!order) {
                showGenericModal("Erro", "Pedido não encontrado.");
                return;
            }
            showLoading();

            if(reportClientNameEl) reportClientNameEl.textContent = order.clientName || 'N/A';
            if(reportOrderIdEl) reportOrderIdEl.textContent = order.id.substring(0,8) + "...";
            if(reportCreatedAtEl) reportCreatedAtEl.textContent = formatDateTime(order.createdAt); 
            if(reportProductionStartDateEl) reportProductionStartDateEl.textContent = order.productionStartDate ? formatDate(order.productionStartDate) : 'Não definida';
            if(reportDeliveryDateEl) reportDeliveryDateEl.textContent = formatDate(order.deliveryDate);
            if(reportPriorityEl) reportPriorityEl.innerHTML = `<span class="status-badge priority-${order.priority}">${(order.priority || 'normal').toUpperCase()}</span>`;
            if(reportOrderPhaseEl) reportOrderPhaseEl.innerHTML = `<span class="status-badge phase-${order.orderPhase || 'estimation'}">${getOrderPhaseText(order.orderPhase)}</span>`;
            if(reportOrderStatusEl) reportOrderStatusEl.innerHTML = `<span class="status-badge status-${order.status}">${getStatusText(order.status)}</span>`;
            if(reportDescriptionEl) reportDescriptionEl.textContent = order.description || 'Nenhuma observação.';

            if (reportCoverImageEl && reportCoverImageErrorEl) {
                if (order.coverImageUrl && order.coverImageUrl.trim() !== "") {
                    const imgData = await imageUrlToBase64(order.coverImageUrl);
                    if (imgData) {
                        reportCoverImageEl.src = imgData;
                        reportCoverImageEl.classList.remove('hidden');
                        reportCoverImageErrorEl.classList.add('hidden');
                    } else {
                        reportCoverImageEl.classList.add('hidden');
                        reportCoverImageErrorEl.textContent = `Falha ao carregar imagem. Verifique a URL, conexão e possíveis restrições de CORS do servidor da imagem. URL: ${order.coverImageUrl}`;
                        reportCoverImageErrorEl.classList.remove('hidden');
                    }
                } else {
                    reportCoverImageEl.classList.add('hidden');
                    reportCoverImageErrorEl.textContent = 'Nenhuma imagem de referência fornecida.';
                    reportCoverImageErrorEl.classList.remove('hidden');
                }
            }

            if (reportOrderItemsEl) {
                reportOrderItemsEl.innerHTML = '';
                if (order.items && order.items.length > 0) {
                    order.items.forEach(item => {
                        const itemP = document.createElement('p');
                        itemP.className = 'p-2 bg-gray-100 rounded';
                        itemP.textContent = `${item.quantity}x ${item.material} (${item.width}cm x ${item.height}cm)`;
                        reportOrderItemsEl.appendChild(itemP);
                    });
                } else {
                    reportOrderItemsEl.innerHTML = '<p class="text-gray-500 italic">Nenhum item especificado.</p>';
                }
            }

            if (reportSelectedStagesEl) {
                reportSelectedStagesEl.innerHTML = '';
                if (order.selectedStages && order.selectedStages.length > 0) {
                    order.selectedStages.forEach(stageKey => {
                        const stageLi = document.createElement('li');
                        stageLi.textContent = getStatusText(stageKey);
                        reportSelectedStagesEl.appendChild(stageLi);
                    });
                } else {
                    reportSelectedStagesEl.innerHTML = '<li class="text-gray-500 italic">Nenhuma etapa de produção selecionada.</li>';
                }
            }

            if (reportDetailedTimelineEl) {
                reportDetailedTimelineEl.innerHTML = '';
                if (order.timeline && order.selectedStages && order.selectedStages.length > 0) {
                    order.selectedStages.forEach(stageKey => {
                        const stageDetail = order.timeline[stageKey] || {};
                        const stageDiv = document.createElement('div');
                        stageDiv.className = 'p-3 border rounded-md bg-gray-50';
                        stageDiv.innerHTML = `
                            <h5 class="font-semibold text-gray-700">${getStatusText(stageKey)}</h5>
                            <p class="text-xs text-gray-600">Estimativa Enviada: <span class="font-medium">${stageDetail.estimationSubmittedAt ? formatDateTime(stageDetail.estimationSubmittedAt) : 'Pendente'}</span></p>
                            <p class="text-xs text-gray-600">Tempo Estimado: <span class="font-medium">${formatTime(stageDetail.estimatedMinutes)}</span></p>
                            ${(order.orderPhase === 'production' || order.orderPhase === 'completed') ? `
                                <p class="text-xs text-gray-600">Início Etapa: <span class="font-medium">${stageDetail.productionStartTime ? formatDateTime(stageDetail.productionStartTime) : 'N/A'}</span></p>
                                <p class="text-xs text-gray-600">Fim Etapa: <span class="font-medium">${stageDetail.productionEndTime ? formatDateTime(stageDetail.productionEndTime) : (order.status === stageKey && order.orderPhase === 'production' ? 'Em Andamento' : 'Pendente')}</span></p>
                                <p class="text-xs text-gray-600">Tempo Real Gasto: <span class="font-medium">${formatTime(stageDetail.actualMinutes)}</span></p>
                            ` : ''}
                        `;
                        reportDetailedTimelineEl.appendChild(stageDiv);
                    });
                } else {
                    reportDetailedTimelineEl.innerHTML = '<p class="text-gray-500 italic">Nenhum detalhe de tempo disponível.</p>';
                }
            }
            
            if (reportQCTableBodyEl) {
                reportQCTableBodyEl.innerHTML = '';
                const qcItems = [
                    "Visual (impressão)", "Resina (espessura/defeitos)", "Corte (acabamento/borda)",
                    "Conferência de quantidade", "Embalagem final"
                ];
                qcItems.forEach(itemText => {
                    const row = reportQCTableBodyEl.insertRow();
                    row.innerHTML = `
                        <td class="p-2 border border-gray-300">${itemText}</td>
                        <td class="p-2 border border-gray-300 h-10"></td>
                        <td class="p-2 border border-gray-300 h-10"></td>
                        <td class="p-2 border border-gray-300 h-10"></td>
                        <td class="p-2 border border-gray-300 h-10"></td>
                    `;
                });
            }

            if(orderDetailsReportModalEl) orderDetailsReportModalEl.classList.remove('hidden');
            hideLoading();
        }

        window.closeOrderDetailsReportModal = function() {
            if(orderDetailsReportModalEl) orderDetailsReportModalEl.classList.add('hidden');
            if(reportCoverImageEl) reportCoverImageEl.src = '';
            if(reportCoverImageEl) reportCoverImageEl.classList.add('hidden');
            if(reportCoverImageErrorEl) reportCoverImageErrorEl.classList.add('hidden');
        }

        // CORREÇÃO 7: Função showDailyLoadDetailsModal melhorada
        window.showDailyLoadDetailsModal = function(date, orders, viewType = 'delivery') {
            if (!dailyLoadDetailsModalEl || !dailyLoadDetailsModalTitleEl || !dailyLoadDetailsModalBodyEl) {
                console.error("[DEBUG] Elementos do modal de carga diária não encontrados.");
                return;
            }
            
            // Se orders é uma string, fazer parse
            if (typeof orders === 'string') {
                try {
                    orders = JSON.parse(orders);
                } catch (error) {
                    console.error("[DEBUG] Erro ao fazer parse dos pedidos:", error);
                    orders = [];
                }
            }
            
            // Garantir que orders é um array
            if (!Array.isArray(orders)) {
                orders = [];
            }
            
            const modalTitlePrefix = viewType === 'production' ? "Pedidos com Início de Produção em" : "Pedidos para Entrega em";
            dailyLoadDetailsModalTitleEl.textContent = `${modalTitlePrefix} ${formatDate(date)}`;
            
            if (orders && orders.length > 0) {
                let tableHeaders = `
                    <th class="p-2 border border-gray-300 text-left">ID do Pedido</th>
                    <th class="p-2 border border-gray-300 text-left">Cliente</th>
                    <th class="p-2 border border-gray-300 text-left">Tempo Estimado</th>
                `;
                if (viewType === 'production') {
                    tableHeaders += `<th class="p-2 border border-gray-300 text-left">Data Entrega</th>`;
                } else { // delivery
                    tableHeaders += `<th class="p-2 border border-gray-300 text-left">Início Produção</th>`;
                }

                dailyLoadDetailsModalBodyEl.innerHTML = `
                    <div class="overflow-x-auto">
                        <table class="min-w-full text-sm">
                            <thead class="bg-gray-100">
                                <tr>${tableHeaders}</tr>
                            </thead>
                            <tbody>
                                ${orders.map(order => {
                                    let complementaryDateCell = '';
                                    if (viewType === 'production') {
                                        complementaryDateCell = `<td class="p-2 border border-gray-200">${formatDate(order.deliveryDate)}</td>`;
                                    } else { // delivery
                                        complementaryDateCell = `<td class="p-2 border border-gray-200">${order.productionStartDate ? formatDate(order.productionStartDate) : 'N/A'}</td>`;
                                    }
                                    return `
                                        <tr class="hover:bg-gray-50">
                                            <td class="p-2 border border-gray-200 font-mono text-xs">${order.id ? order.id.substring(0,8) + '...' : 'N/A'}</td>
                                            <td class="p-2 border border-gray-200">${order.clientName || 'N/A'}</td>
                                            <td class="p-2 border border-gray-200">${formatTime(order.estimatedTime || 0)}</td>
                                            ${complementaryDateCell}
                                        </tr>
                                    `
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                dailyLoadDetailsModalBodyEl.innerHTML = '<p class="text-gray-500 italic">Nenhum pedido encontrado para esta data.</p>';
            }
            dailyLoadDetailsModalEl.classList.remove('hidden');
        }

        window.closeDailyLoadDetailsModal = function() {
            if(dailyLoadDetailsModalEl) dailyLoadDetailsModalEl.classList.add('hidden');
        }

        function toggleOrderSelectionMode(shouldRenderTable = true) {
            isOrderSelectionModeActive = !isOrderSelectionModeActive;
            selectedOrdersForDeletion.clear(); 

            if (toggleOrderSelectionModeBtnEl) {
                toggleOrderSelectionModeBtnEl.textContent = isOrderSelectionModeActive ? 'Cancelar Seleção' : 'Selecionar para Excluir';
                toggleOrderSelectionModeBtnEl.classList.toggle('btn-warning', !isOrderSelectionModeActive);
                toggleOrderSelectionModeBtnEl.classList.toggle('btn-secondary', isOrderSelectionModeActive);
            }
            if (deleteSelectedOrdersBtnEl) {
                deleteSelectedOrdersBtnEl.classList.toggle('hidden', !isOrderSelectionModeActive);
                deleteSelectedOrdersBtnEl.disabled = true; 
                deleteSelectedOrdersBtnEl.textContent = 'Excluir Selecionados';
            }
            if (shouldRenderTable) {
                renderAllOrdersTable(); 
            }
        }

        if (toggleOrderSelectionModeBtnEl) {
            toggleOrderSelectionModeBtnEl.addEventListener('click', () => toggleOrderSelectionMode(true));
        }

        if (deleteSelectedOrdersBtnEl) {
            deleteSelectedOrdersBtnEl.addEventListener('click', deleteSelectedOrdersFromDb);
        }

        window.openEditOrderDatesModal = function(orderId) {
            if (!currentUserProfile || currentUserProfile.role !== MANAGER_ROLE) {
                showGenericModal("Acesso Negado", "Apenas gerentes podem editar datas de pedidos.");
                return;
            }
            const order = allOrdersCache.find(o => o.id === orderId);
            if (!order) {
                showGenericModal("Erro", "Pedido não encontrado.");
                return;
            }

            if (editOrderIdInputEl) editOrderIdInputEl.value = orderId;
            if (editProductionStartDateInputEl) editProductionStartDateInputEl.value = order.productionStartDate || '';
            if (editDeliveryDateInputEl) editDeliveryDateInputEl.value = order.deliveryDate || '';
            
            const today = new Date().toISOString().split("T")[0];
            if (editProductionStartDateInputEl) editProductionStartDateInputEl.min = today;
            if (editDeliveryDateInputEl) editDeliveryDateInputEl.min = today;


            if (editOrderDatesModalEl) editOrderDatesModalEl.classList.remove('hidden');
        }

        window.closeEditOrderDatesModal = function() {
            if (editOrderDatesModalEl) editOrderDatesModalEl.classList.add('hidden');
        }

        async function saveOrderDates() {
            if (!editOrderIdInputEl || !editProductionStartDateInputEl || !editDeliveryDateInputEl) return;

            const orderId = editOrderIdInputEl.value;
            const newProductionStartDate = editProductionStartDateInputEl.value;
            const newDeliveryDate = editDeliveryDateInputEl.value;

            if (!orderId) {
                showGenericModal("Erro", "ID do pedido não encontrado para salvar as datas.");
                return;
            }
            if (!newProductionStartDate && !newDeliveryDate) {
                showGenericModal("Atenção", "Nenhuma nova data foi fornecida.");
                return;
            }

            const updateData = {};
            if (newProductionStartDate) updateData.productionStartDate = newProductionStartDate;
            if (newDeliveryDate) updateData.deliveryDate = newDeliveryDate;

            showLoading();
            try {
                const orderRef = doc(ordersCollectionRef, orderId);
                await updateDoc(orderRef, updateData);
                showToast("Datas do pedido atualizadas!", "success");
                closeEditOrderDatesModal();
            } catch (error) {
                console.error("Erro ao salvar datas do pedido:", error);
                showGenericModal("Erro", "Não foi possível salvar as alterações nas datas do pedido.");
            } finally {
                hideLoading();
            }
        }
        if(saveOrderDatesBtnEl) saveOrderDatesBtnEl.addEventListener('click', saveOrderDates);

        document.addEventListener('DOMContentLoaded', function() {
            console.log("[DEBUG] DOM Content Loaded - Iniciando configuração da UI");
            const deliveryDateInput = document.getElementById('deliveryDate');
            if(deliveryDateInput) deliveryDateInput.min = new Date().toISOString().split("T")[0];
            
            if (loginSectionEl) loginSectionEl.classList.remove('hidden');
            if (appContentEl) appContentEl.classList.add('hidden');
            if (userInfoEl) userInfoEl.classList.add('hidden');
            if(notificationBellContainerEl) notificationBellContainerEl.classList.add('hidden');
            console.log("[DEBUG] DOMContentLoaded: Estado inicial da UI configurado para login.");
        });

        // === FUNÇÕES AUSENTES QUE FORAM ADICIONADAS (CORREÇÃO 2) ===
        
        // Função para confirmar exclusão de pedido individual
        function confirmDeleteOrder(orderId) {
            if (!currentUserProfile || currentUserProfile.role !== MANAGER_ROLE) {
                showGenericModal("Acesso Negado", "Apenas gerentes podem excluir pedidos.");
                return;
            }
            
            const order = allOrdersCache.find(o => o.id === orderId);
            if (!order) {
                showGenericModal("Erro", "Pedido não encontrado.");
                return;
            }
            
            showGenericModal(
                "Confirmar Exclusão", 
                `Deseja excluir o pedido <strong>#${order.id.substring(0,5)}</strong> de <strong>${order.clientName}</strong>?<br><small>Esta ação não pode ser desfeita.</small>`,
                [
                    { 
                        text: "Excluir", 
                        type: "danger", 
                        callback: () => deleteOrderFromDb(orderId) 
                    },
                    { 
                        text: "Cancelar", 
                        type: "secondary" 
                    }
                ]
            );
        }

        // Função para excluir pedido do banco de dados
        async function deleteOrderFromDb(orderId) {
            if (!currentUserProfile || currentUserProfile.role !== MANAGER_ROLE) {
                showGenericModal("Acesso Negado", "Apenas gerentes podem excluir pedidos.");
                return;
            }
            
            showLoading();
            try {
                const orderRef = doc(ordersCollectionRef, orderId);
                await deleteDoc(orderRef);
                showToast("Pedido excluído com sucesso.", "success");
            } catch (error) {
                console.error("Erro ao excluir pedido:", error);
                showGenericModal("Erro", "Não foi possível excluir o pedido: " + error.message);
            } finally {
                hideLoading();
            }
        }

        // Função para validar dados de pedido
        function validateOrderData(order) {
            const requiredFields = ['id', 'clientName', 'createdAt', 'deliveryDate'];
            const missingFields = requiredFields.filter(field => !order[field]);
            
            if (missingFields.length > 0) {
                console.warn(`[DEBUG] Dados incompletos no pedido ${order.id || 'UNKNOWN'}:`, missingFields);
                return false;
            }
            return true;
        }

        // Função para limpeza de recursos ao fazer logout
        function cleanupResources() {
            // Limpar listeners
            if (unsubscribeOrders) {
                unsubscribeOrders();
                unsubscribeOrders = null;
            }
            if (unsubscribeCollaborators) {
                unsubscribeCollaborators();
                unsubscribeCollaborators = null;
            }
            if (unsubscribeNotifications) {
                unsubscribeNotifications();
                unsubscribeNotifications = null;
            }
            
            // Limpar caches
            allOrdersCache = [];
            allCollaboratorsCache = [];
            userNotificationsCache = [];
            dailyLoadCache = {};
            selectedOrdersForDeletion.clear();
        }

        // Função para operações seguras em elementos
        function safeElementOperation(elementId, operation) {
            const element = document.getElementById(elementId);
            if (element && operation) {
                return operation(element);
            }
            console.warn(`[DEBUG] Elemento ${elementId} não encontrado para operação.`);
            return null;
        }

        console.log("[DEBUG] End of script module reached.");
    
