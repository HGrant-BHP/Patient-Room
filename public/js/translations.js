const translations = {
    en: {
        // Common
        backToDashboard: 'Back to Dashboard',
        settings: 'Settings',
        languageSettings: 'Language Settings',
        settingsSaved: 'Settings saved successfully',

        // Dashboard
        requestAssistance: 'Request Assistance',
        requestAssistanceDesc: 'Request Assistance From Staff',
        requestSent: 'Request has been sent',
        meals: 'Meals',
        mealsDesc: 'Meal Selection Service',
        chat: 'Chat',
        chatDesc: 'Chat With Staff',
        entertainment: 'Entertainment',
        entertainmentDesc: 'Premium Content',
        roomControls: 'Room Controls',
        roomControlsDesc: 'Customize Your Space',
        personalizeSettings: 'Personalize Settings',
        welcome: 'Welcome,',

        // Meals
        breakfast: 'Breakfast',
        lunch: 'Lunch',
        dinner: 'Dinner',
        mealSelectionSaved: 'Your meal selection has been saved'
    },
    es: {
        // Common
        backToDashboard: 'Volver al Panel',
        settings: 'Configuración',
        languageSettings: 'Configuración de Idioma',
        settingsSaved: 'Configuración guardada exitosamente',

        // Dashboard
        requestAssistance: 'Solicitar Asistencia',
        requestAssistanceDesc: 'Solicitar Asistencia del Personal',
        requestSent: 'Solicitud enviada',
        meals: 'Comidas',
        mealsDesc: 'Servicio de Selección de Comidas',
        chat: 'Chat',
        chatDesc: 'Chat con el Personal',
        entertainment: 'Entretenimiento',
        entertainmentDesc: 'Contenido Premium',
        roomControls: 'Control de Habitación',
        roomControlsDesc: 'Personalizar tu Espacio',
        personalizeSettings: 'Personalizar Configuración',
        welcome: 'Bienvenido,',

        // Meals
        breakfast: 'Desayuno',
        lunch: 'Almuerzo',
        dinner: 'Cena',
        mealSelectionSaved: 'Tu selección de comida ha sido guardada'
    }
};

// Function to update page content based on selected language
function updatePageContent(lang) {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            if (element.tagName === 'INPUT' && element.type === 'placeholder') {
                element.placeholder = translations[lang][key];
            } else {
                element.textContent = translations[lang][key];
            }
        }
    });

    // Update date and time format
    if (typeof updateDateTime === 'function') {
        updateDateTime(lang);
    }
}

// Function to get current language
function getCurrentLanguage() {
    return localStorage.getItem('language') || 'en';
}

// Initialize language on page load
document.addEventListener('DOMContentLoaded', () => {
    const currentLang = getCurrentLanguage();
    updatePageContent(currentLang);
}); 