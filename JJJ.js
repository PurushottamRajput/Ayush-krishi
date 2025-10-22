// Firebase कॉन्फ़िगरेशन
const firebaseConfig = typeof _firebase_config !== 'undefined' && _firebase_config !== '' 
    ? JSON.parse(_firebase_config) 
    : {};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// मुख्य ऐप क्लास
class AyushKrishiSetuApp {
    constructor() {
        this.screen = 'home';
        this.userId = null;
        this.db = null;
        this.notification = null;
        this.seedListings = [];
        this.produceListings = [];
        
        this.init();
    }
    
    init() {
        this.render();
        this.initFirebase();
        this.setupEventListeners();
    }
    
    // Firebase प्रारंभ करें
    initFirebase() {
        try {
            if (Object.keys(firebaseConfig).length === 0) {
                console.error("Firebase Config is missing or empty.");
                return;
            }
            
            const app = firebase.initializeApp(firebaseConfig);
            const auth = firebase.auth(app);
            const firestore = firebase.firestore(app);
            this.db = firestore;
            
            // ऑथ स्टेट परिवर्तन सुनें
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    this.userId = user.uid;
                    this.updateUI();
                } else {
                    try {
                        if (initialAuthToken) {
                            await auth.signInWithCustomToken(initialAuthToken);
                        } else {
                            await auth.signInAnonymously();
                        }
                    } catch (error) {
                        console.error("Authentication failed:", error);
                    }
                }
            });
        } catch (error) {
            console.error("Firebase initialization failed:", error);
        }
    }
    
    // स्क्रीन बदलें
    setScreen(screen) {
        this.screen = screen;
        this.render();
    }
    
    // उत्पाद जोड़ें
    async addProduce(produceData) {
        if (!this.db) return;
        try {
            await this.db.collection(`artifacts/${appId}/public/data/produce_listings`).add({
                ...produceData,
                farmerId: this.userId,
                createdAt: new Date()
            });
            this.showNotification('आपकी उपज सफलतापूर्वक सूचीबद्ध हो गई है!', 'success');
        } catch (error) {
            console.error("Error adding produce listing: ", error);
            this.showNotification('लिस्टिंग जोड़ने में विफल। कृपया पुन: प्रयास करें।', 'error');
        }
    }
    
    // बीज जोड़ें
    async addSeed(seedData) {
        if (!this.db) return;
        try {
            await this.db.collection(`artifacts/${appId}/public/data/seed_listings`).add({
                ...seedData,
                supplierId: this.userId,
                createdAt: new Date()
            });
            this.showNotification('आपका बीज सफलतापूर्वक सूचीबद्ध हो गया है!', 'success');
        } catch (error) {
            console.error("Error adding seed listing: ", error);
            this.showNotification('बीज लिस्टिंग जोड़ने में विफल। कृपया पुन: प्रयास करें।', 'error');
        }
    }
    
    // सूचना दिखाएं
    showNotification(message, type) {
        this.notification = { message, type };
        this.render();
        
        setTimeout(() => {
            this.notification = null;
            this.render();
        }, 4000);
    }
    
    // UI अपडेट करें
    updateUI() {
        const footer = document.querySelector('footer');
        if (footer && this.userId) {
            footer.textContent = `User ID: ${this.userId}`;
            footer.style.display = 'block';
        }
    }
    
    // घटना श्रोताओं को सेटअप करें
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            // होम स्क्रीन बटन
            if (e.target.closest('.home-farmer-btn')) {
                this.setScreen('farmer');
            } else if (e.target.closest('.home-buyer-btn')) {
                this.setScreen('buyer');
            }
            
            // बैक बटन
            if (e.target.closest('.back-btn')) {
                this.setScreen('home');
            }
            
            // टैब स्विच करें
            if (e.target.closest('.tab-btn')) {
                const tabId = e.target.closest('.tab-btn').dataset.tab;
                this.setActiveTab(tabId);
            }
            
            // संपर्क मोडल बंद करें
            if (e.target.closest('.modal-close') || e.target.closest('.modal-overlay')) {
                this.closeContactModal();
            }
        });
        
        // फॉर्म सबमिशन
        document.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (e.target.id === 'produce-form') {
                this.handleProduceSubmit(e);
            } else if (e.target.id === 'seed-form') {
                this.handleSeedSubmit(e);
            }
        });
    }
    
    // सक्रिय टैब सेट करें
    setActiveTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        
        const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
        const activeContent = document.getElementById(`${tabId}-content`);
        
        if (activeBtn && activeContent) {
            activeBtn.classList.add('active');
            activeContent.style.display = 'block';
        }
    }
    
    // उत्पाद फॉर्म सबमिट करें
    handleProduceSubmit(e) {
        const formData = new FormData(e.target);
        const produceData = {
            name: formData.get('produce-name'),
            quantity: formData.get('produce-quantity'),
            price: formData.get('produce-price'),
            location: formData.get('produce-location'),
            contact: formData.get('produce-contact')
        };
        
        if (produceData.name && produceData.quantity && produceData.price && produceData.location && produceData.contact) {
            this.addProduce(produceData);
            e.target.reset();
        }
    }
    
    // बीज फॉर्म सबमिट करें
    handleSeedSubmit(e) {
        const formData = new FormData(e.target);
        const seedData = {
            name: formData.get('seed-name'),
            quantity: formData.get('seed-quantity'),
            price: formData.get('seed-price'),
            supplier: formData.get('seed-supplier'),
            contact: formData.get('seed-contact')
        };
        
        if (seedData.name && seedData.quantity && seedData.price && seedData.supplier && seedData.contact) {
            this.addSeed(seedData);
            e.target.reset();
        }
    }
    
    // संपर्क मोडल खोलें
    openContactModal(data) {
        this.contactModalData = data;
        this.render();
    }
    
    // संपर्क मोडल बंद करें
    closeContactModal() {
        this.contactModalData = null;
        this.render();
    }
    
    // UI रेंडर करें
    render() {
        const root = document.getElementById('root');
        
        let screenContent = '';
        switch(this.screen) {
            case 'farmer':
                screenContent = this.renderFarmerDashboard();
                break;
            case 'buyer':
                screenContent = this.renderBuyerDashboard();
                break;
            default:
                screenContent = this.renderHomeScreen();
        }
        
        root.innerHTML = `
            <div class="bg-gray-50 min-h-screen font-sans text-gray-800 antialiased">
                <div class="container mx-auto max-w-lg p-0">
                    ${screenContent}
                    ${this.userId ? `
                        <footer class="text-center p-4 text-xs text-gray-400 fixed bottom-0 left-0 right-0 max-w-lg mx-auto">
                            User ID: ${this.userId}
                        </footer>
                    ` : ''}
                    ${this.notification ? this.renderNotification() : ''}
                    ${this.contactModalData ? this.renderContactModal() : ''}
                </div>
            </div>
        `;
        
        // डेटा लोड करें
        if (this.userId && this.db) {
            this.loadData();
        }
    }
    
    // होम स्क्रीन रेंडर करें
    renderHomeScreen() {
        return `
            <div class="flex flex-col h-screen justify-between p-6 bg-emerald-50/50">
                <header class="text-center pt-10">
                    <h1 class="text-4xl font-extrabold text-emerald-800">आयुष-कृषि सेतु</h1>
                </header>
                
                <main class="text-center">
                    <h2 class="text-2xl font-bold text-gray-700 mb-2">आयुर्वेद की खेती को एक नया बाज़ार दें</h2>
                    <p class="text-gray-600 mb-12">
                        किसानों को सीधे बीज आपूर्तिकर्ताओं और खरीदारों से जोड़ना।
                    </p>
                    
                    <div class="space-y-6">
                        <div class="home-farmer-btn bg-white p-8 rounded-2xl shadow-lg border border-emerald-200 transition-transform hover:scale-105 cursor-pointer">
                            <h3 class="text-2xl font-bold text-emerald-700">मैं किसान हूँ</h3>
                        </div>
                        <div class="home-buyer-btn bg-white p-8 rounded-2xl shadow-lg border border-amber-800/20 transition-transform hover:scale-105 cursor-pointer">
                            <h3 class="text-2xl font-bold text-amber-800">मैं खरीदार/आपूर्तिकर्ता हूँ</h3>
                        </div>
                    </div>
                </main>
                
                <div></div>
            </div>
        `;
    }
    
    // किसान डैशबोर्ड रेंडर करें
    renderFarmerDashboard() {
        return `
            <div>
                ${this.renderHeader('किसान डैशबोर्ड')}
                <main class="p-4 pb-16">
                    <div class="flex justify-center border-b-2 border-gray-200 mb-6">
                        <button data-tab="findSeeds" class="tab-btn flex-1 py-3 text-center font-semibold transition-colors duration-300 active border-b-4 border-emerald-600 text-emerald-600">
                            बीज ढूंढें
                        </button>
                        <button data-tab="sellProduce" class="tab-btn flex-1 py-3 text-center font-semibold transition-colors duration-300 text-gray-500 hover:text-emerald-500">
                            अपनी उपज बेचें
                        </button>
                    </div>
                    
                    <div id="findSeeds-content" class="tab-content">
                        <div class="space-y-4">
                            <input type="text" placeholder="बीज का नाम खोजें (जैसे अश्वगंधा)" class="search-seeds w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500">
                            <div id="seeds-list">
                                ${this.renderSeedListings()}
                            </div>
                        </div>
                    </div>
                    
                    <div id="sellProduce-content" class="tab-content" style="display: none;">
                        <form id="produce-form" class="bg-white p-6 rounded-2xl shadow-lg border space-y-4">
                            ${this.renderFormInput('produce-name', 'फसल का नाम', 'text', 'जैसे सतावरी')}
                            ${this.renderFormInput('produce-quantity', 'मात्रा (किग्रा/क्विंटल)', 'text', 'जैसे 10 क्विंटल')}
                            ${this.renderFormInput('produce-price', 'मूल्य प्रति किग्रा (₹)', 'number', 'जैसे 80', 'decimal')}
                            ${this.renderFormInput('produce-location', 'स्थान', 'text', '', '', 'दरभंगा, बिहार')}
                            ${this.renderFormInput('produce-contact', 'संपर्क मोबाइल नंबर', 'tel', 'मोबाइल नंबर (उदा: 9876543210)', 'numeric')}
                            <button type="submit" class="w-full bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-emerald-700 transition-transform hover:scale-105">
                                लिस्टिंग जोड़ें
                            </button>
                        </form>
                    </div>
                </main>
            </div>
        `;
    }
    
    // खरीदार डैशबोर्ड रेंडर करें
    renderBuyerDashboard() {
        return `
            <div>
                ${this.renderHeader('खरीदार/आपूर्तिकर्ता डैशबोर्ड')}
                <main class="p-4 pb-16">
                    <div class="flex justify-center border-b-2 border-gray-200 mb-6">
                        <button data-tab="buyProduce" class="tab-btn flex-1 py-3 text-center font-semibold transition-colors duration-300 active border-b-4 border-amber-800 text-amber-800">
                            उपज खरीदें
                        </button>
                        <button data-tab="sellSeeds" class="tab-btn flex-1 py-3 text-center font-semibold transition-colors duration-300 text-gray-500 hover:text-amber-800">
                            बीज बेचें
                        </button>
                    </div>
                    
                    <div id="buyProduce-content" class="tab-content">
                        <div class="space-y-4">
                            <input type="text" placeholder="फसल का नाम खोजें (जैसे नीम)" class="search-produce w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-800/50">
                            <div id="produce-list">
                                ${this.renderProduceListings()}
                            </div>
                        </div>
                    </div>
                    
                    <div id="sellSeeds-content" class="tab-content" style="display: none;">
                        <form id="seed-form" class="bg-white p-6 rounded-2xl shadow-lg border space-y-4">
                            ${this.renderFormInput('seed-name', 'बीज का नाम', 'text', 'जैसे अश्वगंधा')}
                            ${this.renderFormInput('seed-quantity', 'उपलब्ध मात्रा (किग्रा)', 'text', 'जैसे 5 kg')}
                            ${this.renderFormInput('seed-price', 'मूल्य प्रति किग्रा (₹)', 'number', 'जैसे 1500', 'decimal')}
                            ${this.renderFormInput('seed-supplier', 'आपूर्तिकर्ता का नाम', 'text', 'जैसे राम बीज भंडार')}
                            ${this.renderFormInput('seed-contact', 'संपर्क मोबाइल नंबर', 'tel', 'मोबाइल नंबर (उदा: 9876543210)', 'numeric')}
                            <button type="submit" class="w-full bg-amber-800 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-amber-900 transition-transform hover:scale-105">
                                बीज लिस्टिंग जोड़ें
                            </button>
                        </form>
                    </div>
                </main>
            </div>
        `;
    }
    
    // हेडर रेंडर करें
    renderHeader(title) {
        return `
            <header class="bg-emerald-600 text-white p-4 text-center text-xl font-bold shadow-md sticky top-0 z-10 flex items-center justify-between">
                <button class="back-btn text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 class="flex-grow text-center">${title}</h1>
                <div class="w-6"></div>
            </header>
        `;
    }
    
    // फॉर्म इनपुट रेंडर करें
    renderFormInput(id, label, type = 'text', placeholder = '', inputMode = '', value = '') {
        return `
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">${label}</label>
                <input 
                    id="${id}"
                    name="${id}"
                    type="${type}"
                    ${value ? `value="${value}"` : ''}
                    placeholder="${placeholder}"
                    ${inputMode ? `inputmode="${inputMode}"` : ''}
                    required
                    class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                >
            </div>
        `;
    }
    
    // बीज लिस्टिंग रेंडर करें
    renderSeedListings() {
        if (this.seedListings.length === 0) {
            return '<p class="text-center text-gray-500 mt-8">कोई बीज उपलब्ध नहीं है।</p>';
        }
        
        return this.seedListings.map(seed => `
            <div class="seed-item bg-white p-4 rounded-xl shadow-md border" data-id="${seed.id}">
                <h3 class="font-bold text-lg text-emerald-800">${seed.name || 'N/A'}</h3>
                <p class="text-sm text-gray-600">आपूर्तिकर्ता: ${seed.supplier || 'N/A'}</p>
                <p class="text-sm text-gray-600">मात्रा: ${seed.quantity || 'N/A'}</p>
                <div class="flex justify-between items-center mt-3">
                    <span class="font-bold text-lg text-gray-800">₹${seed.price || 'N/A'}/kg</span>
                    <button 
                        class="contact-seed-btn bg-emerald-600 text-white py-2 px-4 rounded-lg shadow-md hover:bg-emerald-700 transition-colors text-sm font-semibold"
                        data-seed='${JSON.stringify(seed)}'
                    >
                        बीज की मांग करें
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // उत्पाद लिस्टिंग रेंडर करें
    renderProduceListings() {
        if (this.produceListings.length === 0) {
            return '<p class="text-center text-gray-500 mt-8">कोई उपज उपलब्ध नहीं है।</p>';
        }
        
        return this.produceListings.map(prod => `
            <div class="produce-item bg-white p-4 rounded-xl shadow-md border" data-id="${prod.id}">
                <h3 class="font-bold text-lg text-amber-900">${prod.name || 'N/A'}</h3>
                <p class="text-sm text-gray-600">किसान ID: ${prod.farmerId || 'अज्ञात'}</p>
                <p class="text-sm text-gray-600">मात्रा: ${prod.quantity || 'N/A'}</p>
                <p class="text-sm text-gray-600">स्थान: ${prod.location || 'N/A'}</p>
                <div class="flex justify-between items-center mt-3">
                    <span class="font-bold text-lg text-gray-800">₹${prod.price || 'N/A'}/kg</span>
                    <button 
                        class="contact-produce-btn bg-amber-800 text-white py-2 px-4 rounded-lg shadow-md hover:bg-amber-900 transition-colors text-sm font-semibold"
                        data-produce='${JSON.stringify(prod)}'
                    >
                        खरीद के लिए संपर्क करें
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // सूचना रेंडर करें
    renderNotification() {
        const colorClass = this.notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600';
        return `
            <div class="fixed bottom-16 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl text-white shadow-xl z-50 text-sm font-semibold transition-all duration-300 ${colorClass}">
                ${this.notification.message}
            </div>
        `;
    }
    
    // संपर्क मोडल रेंडर करें
    renderContactModal() {
        const contactType = this.contactModalData.type === 'किसान' ? 'खरीद' : 'बीज';
        const contactInfo = this.contactModalData.contact || 'उपलब्ध नहीं';
        const contactClass = contactInfo !== 'उपलब्ध नहीं' ? 'text-lg text-gray-800 font-bold' : 'text-base text-red-500 font-semibold';
        
        return `
            <div class="modal-overlay fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div class="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">${contactType} के लिए संपर्क करें</h3>
                    <p class="text-gray-600 mb-2">${this.contactModalData.type} का नाम/ID:</p>
                    <p class="text-xl font-semibold text-emerald-700 mb-4 break-all">${this.contactModalData.name}</p>
                    
                    <p class="text-gray-600 mb-2">मोबाइल नंबर:</p>
                    <p class="${contactClass}">${contactInfo}</p>
                    
                    <div class="mt-6 flex justify-between space-x-3">
                        <button class="modal-close flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl font-semibold transition-colors hover:bg-gray-300">
                            बंद करें
                        </button>
                        <button 
                            class="copy-contact-btn flex-1 text-white py-3 rounded-xl font-semibold transition-colors ${contactInfo !== 'उपलब्ध नहीं' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400 cursor-not-allowed'}"
                            ${contactInfo === 'उपलब्ध नहीं' ? 'disabled' : ''}
                        >
                            नंबर कॉपी करें
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // डेटा लोड करें
    loadData() {
        // बीज लिस्टिंग
        this.db.collection(`artifacts/${appId}/public/data/seed_listings`)
            .onSnapshot((querySnapshot) => {
                this.seedListings = [];
                querySnapshot.forEach((doc) => {
                    this.seedListings.push({ id: doc.id, ...doc.data() });
                });
                
                if (this.screen === 'farmer') {
                    this.render();
                }
            }, (error) => console.error("Error fetching seeds:", error));
        
        // उत्पाद लिस्टिंग
        this.db.collection(`artifacts/${appId}/public/data/produce_listings`)
            .onSnapshot((querySnapshot) => {
                this.produceListings = [];
                querySnapshot.forEach((doc) => {
                    this.produceListings.push({ id: doc.id, ...doc.data() });
                });
                
                if (this.screen === 'buyer') {
                    this.render();
                }
            }, (error) => console.error("Error fetching produce:", error));
    }
}

// ऐप प्रारंभ करें
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AyushKrishiSetuApp();
});