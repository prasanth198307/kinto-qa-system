import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// ─── Locale definitions — major world languages ──────────────────────────────
export type Locale =
  | "en" | "hi" | "te" | "ta" | "bn" | "ar"
  | "es" | "fr" | "de" | "pt" | "zh" | "ja" | "ru" | "id";

export const LOCALES: { code: Locale; label: string; nativeLabel: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", dir: "ltr" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు", dir: "ltr" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்", dir: "ltr" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা", dir: "ltr" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
  { code: "es", label: "Spanish", nativeLabel: "Español", dir: "ltr" },
  { code: "fr", label: "French", nativeLabel: "Français", dir: "ltr" },
  { code: "de", label: "German", nativeLabel: "Deutsch", dir: "ltr" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português", dir: "ltr" },
  { code: "zh", label: "Chinese", nativeLabel: "中文", dir: "ltr" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語", dir: "ltr" },
  { code: "ru", label: "Russian", nativeLabel: "Русский", dir: "ltr" },
  { code: "id", label: "Indonesian", nativeLabel: "Bahasa Indonesia", dir: "ltr" },
];

// ─── Translation dictionaries ────────────────────────────────────────────────
// Keys cover common UI chrome: buttons, statuses, table headers, nav labels.
// t(key) falls back to English, then to the key itself.
const en: Record<string, string> = {
  // Common actions
  save: "Save", cancel: "Cancel", edit: "Edit", delete: "Delete", add: "Add",
  create: "Create", update: "Update", search: "Search", export: "Export",
  print: "Print", download: "Download", upload: "Upload", submit: "Submit",
  confirm: "Confirm", close: "Close", back: "Back", next: "Next", view: "View",
  refresh: "Refresh", filter: "Filter", actions: "Actions", loading: "Loading...",
  no_data: "No data found", select: "Select", all: "All", yes: "Yes", no: "No",
  // Table headers
  date: "Date", amount: "Amount", status: "Status", name: "Name", phone: "Phone",
  email: "Email", address: "Address", total: "Total", quantity: "Quantity",
  price: "Price", customer: "Customer", invoice: "Invoice", balance: "Balance",
  description: "Description", type: "Type", notes: "Notes", code: "Code",
  // Statuses
  active: "Active", inactive: "Inactive", pending: "Pending", approved: "Approved",
  rejected: "Rejected", completed: "Completed", cancelled: "Cancelled",
  draft: "Draft", paid: "Paid", unpaid: "Unpaid", overdue: "Overdue",
  // Navigation / modules
  dashboard: "Dashboard", reports: "Reports", settings: "Settings",
  inventory: "Inventory", sales: "Sales", purchases: "Purchases",
  customers: "Customers", vendors: "Vendors", products: "Products",
  invoices: "Invoices", payments: "Payments", accounting: "Accounting",
  hr_payroll: "HR & Payroll", manufacturing: "Manufacturing", logistics: "Logistics",
  restaurant: "Restaurant", hotel: "Hotel", healthcare: "Healthcare",
  pharmacy: "Pharmacy", education: "Education", agriculture: "Agriculture",
  real_estate: "Real Estate", gold: "Gold", nidhi: "Nidhi Company", ngo: "NGO",
  crm: "CRM", ecommerce: "E-Commerce", retail_pos: "Retail / POS",
  finance: "Finance", users: "Users", logout: "Logout", login: "Login",
  notifications: "Notifications", profile: "Profile", language: "Language",
  // Finance-specific
  tax: "Tax", discount: "Discount", subtotal: "Subtotal", grand_total: "Grand Total",
  journal_entries: "Journal Entries", ledger: "Ledger", trial_balance: "Trial Balance",
  profit_loss: "Profit & Loss", balance_sheet: "Balance Sheet",
};

const hi: Record<string, string> = {
  save: "सहेजें", cancel: "रद्द करें", edit: "संपादित करें", delete: "हटाएं", add: "जोड़ें",
  create: "बनाएं", update: "अपडेट करें", search: "खोजें", export: "निर्यात",
  print: "प्रिंट", download: "डाउनलोड", upload: "अपलोड", submit: "जमा करें",
  confirm: "पुष्टि करें", close: "बंद करें", back: "वापस", next: "आगे", view: "देखें",
  refresh: "रीफ्रेश", filter: "फ़िल्टर", actions: "कार्रवाई", loading: "लोड हो रहा है...",
  no_data: "कोई डेटा नहीं मिला", select: "चुनें", all: "सभी", yes: "हां", no: "नहीं",
  date: "दिनांक", amount: "राशि", status: "स्थिति", name: "नाम", phone: "फ़ोन",
  email: "ईमेल", address: "पता", total: "कुल", quantity: "मात्रा",
  price: "मूल्य", customer: "ग्राहक", invoice: "चालान", balance: "शेष",
  description: "विवरण", type: "प्रकार", notes: "टिप्पणियां", code: "कोड",
  active: "सक्रिय", inactive: "निष्क्रिय", pending: "लंबित", approved: "स्वीकृत",
  rejected: "अस्वीकृत", completed: "पूर्ण", cancelled: "रद्द",
  draft: "प्रारूप", paid: "भुगतान किया", unpaid: "अवैतनिक", overdue: "अतिदेय",
  dashboard: "डैशबोर्ड", reports: "रिपोर्ट", settings: "सेटिंग्स",
  inventory: "इन्वेंटरी", sales: "बिक्री", purchases: "खरीद",
  customers: "ग्राहक", vendors: "विक्रेता", products: "उत्पाद",
  invoices: "चालान", payments: "भुगतान", accounting: "लेखांकन",
  hr_payroll: "एचआर और वेतन", manufacturing: "विनिर्माण", logistics: "लॉजिस्टिक्स",
  restaurant: "रेस्टोरेंट", hotel: "होटल", healthcare: "स्वास्थ्य सेवा",
  pharmacy: "फार्मेसी", education: "शिक्षा", agriculture: "कृषि",
  real_estate: "रियल एस्टेट", gold: "स्वर्ण", nidhi: "निधि कंपनी", ngo: "एनजीओ",
  crm: "सीआरएम", ecommerce: "ई-कॉमर्स", retail_pos: "रिटेल / पीओएस",
  finance: "वित्त", users: "उपयोगकर्ता", logout: "लॉगआउट", login: "लॉगिन",
  notifications: "सूचनाएं", profile: "प्रोफ़ाइल", language: "भाषा",
  tax: "कर", discount: "छूट", subtotal: "उप-योग", grand_total: "कुल योग",
  journal_entries: "जर्नल प्रविष्टियां", ledger: "खाता बही", trial_balance: "तलपट",
  profit_loss: "लाभ-हानि", balance_sheet: "तुलन पत्र",
};

const te: Record<string, string> = {
  save: "సేవ్ చేయండి", cancel: "రద్దు చేయండి", edit: "సవరించండి", delete: "తొలగించండి", add: "జోడించండి",
  create: "సృష్టించండి", update: "నవీకరించండి", search: "వెతకండి", export: "ఎగుమతి",
  print: "ముద్రించు", download: "డౌన్‌లోడ్", upload: "అప్‌లోడ్", submit: "సమర్పించండి",
  confirm: "నిర్ధారించండి", close: "మూసివేయి", back: "వెనుకకు", next: "తదుపరి", view: "చూడండి",
  refresh: "రిఫ్రెష్", filter: "ఫిల్టర్", actions: "చర్యలు", loading: "లోడ్ అవుతోంది...",
  no_data: "డేటా కనుగొనబడలేదు", select: "ఎంచుకోండి", all: "అన్నీ", yes: "అవును", no: "కాదు",
  date: "తేదీ", amount: "మొత్తం", status: "స్థితి", name: "పేరు", phone: "ఫోన్",
  email: "ఇమెయిల్", address: "చిరునామా", total: "మొత్తం", quantity: "పరిమాణం",
  price: "ధర", customer: "కస్టమర్", invoice: "ఇన్వాయిస్", balance: "నిల్వ",
  description: "వివరణ", type: "రకం", notes: "గమనికలు", code: "కోడ్",
  active: "క్రియాశీలం", inactive: "నిష్క్రియం", pending: "పెండింగ్", approved: "ఆమోదించబడింది",
  rejected: "తిరస్కరించబడింది", completed: "పూర్తయింది", cancelled: "రద్దు చేయబడింది",
  draft: "డ్రాఫ్ట్", paid: "చెల్లించబడింది", unpaid: "చెల్లించబడలేదు", overdue: "గడువు దాటింది",
  dashboard: "డాష్‌బోర్డ్", reports: "నివేదికలు", settings: "సెట్టింగ్‌లు",
  inventory: "ఇన్వెంటరీ", sales: "అమ్మకాలు", purchases: "కొనుగోళ్లు",
  customers: "కస్టమర్లు", vendors: "విక్రేతలు", products: "ఉత్పత్తులు",
  invoices: "ఇన్వాయిస్‌లు", payments: "చెల్లింపులు", accounting: "అకౌంటింగ్",
  hr_payroll: "హెచ్‌ఆర్ & పేరోల్", manufacturing: "తయారీ", logistics: "లాజిస్టిక్స్",
  restaurant: "రెస్టారెంట్", hotel: "హోటల్", healthcare: "ఆరోగ్య సంరక్షణ",
  pharmacy: "ఫార్మసీ", education: "విద్య", agriculture: "వ్యవసాయం",
  real_estate: "రియల్ ఎస్టేట్", gold: "బంగారం", nidhi: "నిధి కంపెనీ", ngo: "ఎన్జీఓ",
  crm: "సీఆర్ఎం", ecommerce: "ఈ-కామర్స్", retail_pos: "రిటైల్ / పీఓఎస్",
  finance: "ఫైనాన్స్", users: "వినియోగదారులు", logout: "లాగ్అవుట్", login: "లాగిన్",
  notifications: "నోటిఫికేషన్లు", profile: "ప్రొఫైల్", language: "భాష",
  tax: "పన్ను", discount: "తగ్గింపు", subtotal: "ఉప-మొత్తం", grand_total: "మొత్తం",
  journal_entries: "జర్నల్ ఎంట్రీలు", ledger: "లెడ్జర్", trial_balance: "ట్రయల్ బ్యాలెన్స్",
  profit_loss: "లాభ నష్టాలు", balance_sheet: "బ్యాలెన్స్ షీట్",
};

const ar: Record<string, string> = {
  save: "حفظ", cancel: "إلغاء", edit: "تعديل", delete: "حذف", add: "إضافة",
  create: "إنشاء", update: "تحديث", search: "بحث", export: "تصدير",
  print: "طباعة", download: "تحميل", upload: "رفع", submit: "إرسال",
  confirm: "تأكيد", close: "إغلاق", back: "رجوع", next: "التالي", view: "عرض",
  refresh: "تحديث", filter: "تصفية", actions: "إجراءات", loading: "جارٍ التحميل...",
  no_data: "لا توجد بيانات", select: "اختر", all: "الكل", yes: "نعم", no: "لا",
  date: "التاريخ", amount: "المبلغ", status: "الحالة", name: "الاسم", phone: "الهاتف",
  email: "البريد الإلكتروني", address: "العنوان", total: "الإجمالي", quantity: "الكمية",
  price: "السعر", customer: "العميل", invoice: "الفاتورة", balance: "الرصيد",
  description: "الوصف", type: "النوع", notes: "ملاحظات", code: "الرمز",
  active: "نشط", inactive: "غير نشط", pending: "قيد الانتظار", approved: "معتمد",
  rejected: "مرفوض", completed: "مكتمل", cancelled: "ملغى",
  draft: "مسودة", paid: "مدفوع", unpaid: "غير مدفوع", overdue: "متأخر",
  dashboard: "لوحة التحكم", reports: "التقارير", settings: "الإعدادات",
  inventory: "المخزون", sales: "المبيعات", purchases: "المشتريات",
  customers: "العملاء", vendors: "الموردون", products: "المنتجات",
  invoices: "الفواتير", payments: "المدفوعات", accounting: "المحاسبة",
  hr_payroll: "الموارد البشرية والرواتب", manufacturing: "التصنيع", logistics: "الخدمات اللوجستية",
  restaurant: "مطعم", hotel: "فندق", healthcare: "الرعاية الصحية",
  pharmacy: "صيدلية", education: "التعليم", agriculture: "الزراعة",
  real_estate: "العقارات", gold: "الذهب", nidhi: "شركة نيدهي", ngo: "منظمة غير حكومية",
  crm: "إدارة علاقات العملاء", ecommerce: "التجارة الإلكترونية", retail_pos: "نقاط البيع",
  finance: "المالية", users: "المستخدمون", logout: "تسجيل الخروج", login: "تسجيل الدخول",
  notifications: "الإشعارات", profile: "الملف الشخصي", language: "اللغة",
  tax: "الضريبة", discount: "الخصم", subtotal: "المجموع الفرعي", grand_total: "الإجمالي الكلي",
  journal_entries: "قيود اليومية", ledger: "دفتر الأستاذ", trial_balance: "ميزان المراجعة",
  profit_loss: "الأرباح والخسائر", balance_sheet: "الميزانية العمومية",
};

const ta: Record<string, string> = {
  save: "சேமி", cancel: "ரத்து", edit: "திருத்து", delete: "நீக்கு", add: "சேர்",
  create: "உருவாக்கு", update: "புதுப்பி", search: "தேடு", export: "ஏற்றுமதி",
  print: "அச்சிடு", download: "பதிவிறக்கு", submit: "சமர்ப்பி", confirm: "உறுதிப்படுத்து",
  close: "மூடு", back: "பின்", next: "அடுத்து", view: "காண்க", actions: "செயல்கள்",
  loading: "ஏற்றுகிறது...", no_data: "தரவு இல்லை", all: "அனைத்தும்", yes: "ஆம்", no: "இல்லை",
  date: "தேதி", amount: "தொகை", status: "நிலை", name: "பெயர்", phone: "தொலைபேசி",
  email: "மின்னஞ்சல்", address: "முகவரி", total: "மொத்தம்", quantity: "அளவு",
  price: "விலை", customer: "வாடிக்கையாளர்", invoice: "விலைப்பட்டியல்", balance: "இருப்பு",
  active: "செயலில்", pending: "நிலுவையில்", approved: "அங்கீகரிக்கப்பட்டது", completed: "முடிந்தது",
  paid: "செலுத்தப்பட்டது", overdue: "தாமதம்",
  dashboard: "டாஷ்போர்டு", reports: "அறிக்கைகள்", settings: "அமைப்புகள்",
  inventory: "சரக்கு", sales: "விற்பனை", purchases: "கொள்முதல்", customers: "வாடிக்கையாளர்கள்",
  products: "தயாரிப்புகள்", invoices: "விலைப்பட்டியல்கள்", payments: "கொடுப்பனவுகள்",
  accounting: "கணக்கியல்", logout: "வெளியேறு", login: "உள்நுழை", language: "மொழி",
  tax: "வரி", discount: "தள்ளுபடி", grand_total: "மொத்தத் தொகை",
};

const bn: Record<string, string> = {
  save: "সংরক্ষণ", cancel: "বাতিল", edit: "সম্পাদনা", delete: "মুছুন", add: "যোগ করুন",
  create: "তৈরি করুন", update: "আপডেট", search: "অনুসন্ধান", export: "রপ্তানি",
  print: "প্রিন্ট", download: "ডাউনলোড", submit: "জমা দিন", confirm: "নিশ্চিত করুন",
  close: "বন্ধ", back: "পিছনে", next: "পরবর্তী", view: "দেখুন", actions: "কার্যক্রম",
  loading: "লোড হচ্ছে...", no_data: "কোনো তথ্য নেই", all: "সব", yes: "হ্যাঁ", no: "না",
  date: "তারিখ", amount: "পরিমাণ", status: "অবস্থা", name: "নাম", phone: "ফোন",
  email: "ইমেইল", address: "ঠিকানা", total: "মোট", quantity: "পরিমাণ",
  price: "মূল্য", customer: "গ্রাহক", invoice: "চালান", balance: "ব্যালেন্স",
  active: "সক্রিয়", pending: "মুলতুবি", approved: "অনুমোদিত", completed: "সম্পন্ন",
  paid: "পরিশোধিত", overdue: "বকেয়া",
  dashboard: "ড্যাশবোর্ড", reports: "প্রতিবেদন", settings: "সেটিংস",
  inventory: "মজুদ", sales: "বিক্রয়", purchases: "ক্রয়", customers: "গ্রাহকগণ",
  products: "পণ্য", invoices: "চালানসমূহ", payments: "পেমেন্ট",
  accounting: "হিসাবরক্ষণ", logout: "লগআউট", login: "লগইন", language: "ভাষা",
  tax: "কর", discount: "ছাড়", grand_total: "সর্বমোট",
};

const es: Record<string, string> = {
  save: "Guardar", cancel: "Cancelar", edit: "Editar", delete: "Eliminar", add: "Agregar",
  create: "Crear", update: "Actualizar", search: "Buscar", export: "Exportar",
  print: "Imprimir", download: "Descargar", submit: "Enviar", confirm: "Confirmar",
  close: "Cerrar", back: "Atrás", next: "Siguiente", view: "Ver", actions: "Acciones",
  loading: "Cargando...", no_data: "Sin datos", all: "Todos", yes: "Sí", no: "No",
  date: "Fecha", amount: "Importe", status: "Estado", name: "Nombre", phone: "Teléfono",
  email: "Correo", address: "Dirección", total: "Total", quantity: "Cantidad",
  price: "Precio", customer: "Cliente", invoice: "Factura", balance: "Saldo",
  active: "Activo", pending: "Pendiente", approved: "Aprobado", completed: "Completado",
  paid: "Pagado", overdue: "Vencido",
  dashboard: "Panel", reports: "Informes", settings: "Configuración",
  inventory: "Inventario", sales: "Ventas", purchases: "Compras", customers: "Clientes",
  products: "Productos", invoices: "Facturas", payments: "Pagos",
  accounting: "Contabilidad", logout: "Cerrar sesión", login: "Iniciar sesión", language: "Idioma",
  tax: "Impuesto", discount: "Descuento", grand_total: "Total general",
};

const fr: Record<string, string> = {
  save: "Enregistrer", cancel: "Annuler", edit: "Modifier", delete: "Supprimer", add: "Ajouter",
  create: "Créer", update: "Mettre à jour", search: "Rechercher", export: "Exporter",
  print: "Imprimer", download: "Télécharger", submit: "Soumettre", confirm: "Confirmer",
  close: "Fermer", back: "Retour", next: "Suivant", view: "Voir", actions: "Actions",
  loading: "Chargement...", no_data: "Aucune donnée", all: "Tous", yes: "Oui", no: "Non",
  date: "Date", amount: "Montant", status: "Statut", name: "Nom", phone: "Téléphone",
  email: "E-mail", address: "Adresse", total: "Total", quantity: "Quantité",
  price: "Prix", customer: "Client", invoice: "Facture", balance: "Solde",
  active: "Actif", pending: "En attente", approved: "Approuvé", completed: "Terminé",
  paid: "Payé", overdue: "En retard",
  dashboard: "Tableau de bord", reports: "Rapports", settings: "Paramètres",
  inventory: "Inventaire", sales: "Ventes", purchases: "Achats", customers: "Clients",
  products: "Produits", invoices: "Factures", payments: "Paiements",
  accounting: "Comptabilité", logout: "Déconnexion", login: "Connexion", language: "Langue",
  tax: "Taxe", discount: "Remise", grand_total: "Total général",
};

const de: Record<string, string> = {
  save: "Speichern", cancel: "Abbrechen", edit: "Bearbeiten", delete: "Löschen", add: "Hinzufügen",
  create: "Erstellen", update: "Aktualisieren", search: "Suchen", export: "Exportieren",
  print: "Drucken", download: "Herunterladen", submit: "Absenden", confirm: "Bestätigen",
  close: "Schließen", back: "Zurück", next: "Weiter", view: "Ansehen", actions: "Aktionen",
  loading: "Wird geladen...", no_data: "Keine Daten", all: "Alle", yes: "Ja", no: "Nein",
  date: "Datum", amount: "Betrag", status: "Status", name: "Name", phone: "Telefon",
  email: "E-Mail", address: "Adresse", total: "Gesamt", quantity: "Menge",
  price: "Preis", customer: "Kunde", invoice: "Rechnung", balance: "Saldo",
  active: "Aktiv", pending: "Ausstehend", approved: "Genehmigt", completed: "Abgeschlossen",
  paid: "Bezahlt", overdue: "Überfällig",
  dashboard: "Dashboard", reports: "Berichte", settings: "Einstellungen",
  inventory: "Bestand", sales: "Verkäufe", purchases: "Einkäufe", customers: "Kunden",
  products: "Produkte", invoices: "Rechnungen", payments: "Zahlungen",
  accounting: "Buchhaltung", logout: "Abmelden", login: "Anmelden", language: "Sprache",
  tax: "Steuer", discount: "Rabatt", grand_total: "Gesamtsumme",
};

const pt: Record<string, string> = {
  save: "Salvar", cancel: "Cancelar", edit: "Editar", delete: "Excluir", add: "Adicionar",
  create: "Criar", update: "Atualizar", search: "Pesquisar", export: "Exportar",
  print: "Imprimir", download: "Baixar", submit: "Enviar", confirm: "Confirmar",
  close: "Fechar", back: "Voltar", next: "Próximo", view: "Ver", actions: "Ações",
  loading: "Carregando...", no_data: "Sem dados", all: "Todos", yes: "Sim", no: "Não",
  date: "Data", amount: "Valor", status: "Status", name: "Nome", phone: "Telefone",
  email: "E-mail", address: "Endereço", total: "Total", quantity: "Quantidade",
  price: "Preço", customer: "Cliente", invoice: "Fatura", balance: "Saldo",
  active: "Ativo", pending: "Pendente", approved: "Aprovado", completed: "Concluído",
  paid: "Pago", overdue: "Atrasado",
  dashboard: "Painel", reports: "Relatórios", settings: "Configurações",
  inventory: "Estoque", sales: "Vendas", purchases: "Compras", customers: "Clientes",
  products: "Produtos", invoices: "Faturas", payments: "Pagamentos",
  accounting: "Contabilidade", logout: "Sair", login: "Entrar", language: "Idioma",
  tax: "Imposto", discount: "Desconto", grand_total: "Total geral",
};

const zh: Record<string, string> = {
  save: "保存", cancel: "取消", edit: "编辑", delete: "删除", add: "添加",
  create: "创建", update: "更新", search: "搜索", export: "导出",
  print: "打印", download: "下载", submit: "提交", confirm: "确认",
  close: "关闭", back: "返回", next: "下一步", view: "查看", actions: "操作",
  loading: "加载中...", no_data: "暂无数据", all: "全部", yes: "是", no: "否",
  date: "日期", amount: "金额", status: "状态", name: "名称", phone: "电话",
  email: "邮箱", address: "地址", total: "合计", quantity: "数量",
  price: "价格", customer: "客户", invoice: "发票", balance: "余额",
  active: "启用", pending: "待处理", approved: "已批准", completed: "已完成",
  paid: "已付款", overdue: "逾期",
  dashboard: "仪表盘", reports: "报表", settings: "设置",
  inventory: "库存", sales: "销售", purchases: "采购", customers: "客户",
  products: "产品", invoices: "发票", payments: "付款",
  accounting: "会计", logout: "退出登录", login: "登录", language: "语言",
  tax: "税", discount: "折扣", grand_total: "总计",
};

const ja: Record<string, string> = {
  save: "保存", cancel: "キャンセル", edit: "編集", delete: "削除", add: "追加",
  create: "作成", update: "更新", search: "検索", export: "エクスポート",
  print: "印刷", download: "ダウンロード", submit: "送信", confirm: "確認",
  close: "閉じる", back: "戻る", next: "次へ", view: "表示", actions: "操作",
  loading: "読み込み中...", no_data: "データがありません", all: "すべて", yes: "はい", no: "いいえ",
  date: "日付", amount: "金額", status: "ステータス", name: "名前", phone: "電話",
  email: "メール", address: "住所", total: "合計", quantity: "数量",
  price: "価格", customer: "顧客", invoice: "請求書", balance: "残高",
  active: "有効", pending: "保留中", approved: "承認済み", completed: "完了",
  paid: "支払済み", overdue: "期限超過",
  dashboard: "ダッシュボード", reports: "レポート", settings: "設定",
  inventory: "在庫", sales: "売上", purchases: "仕入", customers: "顧客",
  products: "製品", invoices: "請求書", payments: "支払い",
  accounting: "会計", logout: "ログアウト", login: "ログイン", language: "言語",
  tax: "税", discount: "割引", grand_total: "総合計",
};

const ru: Record<string, string> = {
  save: "Сохранить", cancel: "Отмена", edit: "Изменить", delete: "Удалить", add: "Добавить",
  create: "Создать", update: "Обновить", search: "Поиск", export: "Экспорт",
  print: "Печать", download: "Скачать", submit: "Отправить", confirm: "Подтвердить",
  close: "Закрыть", back: "Назад", next: "Далее", view: "Просмотр", actions: "Действия",
  loading: "Загрузка...", no_data: "Нет данных", all: "Все", yes: "Да", no: "Нет",
  date: "Дата", amount: "Сумма", status: "Статус", name: "Имя", phone: "Телефон",
  email: "Эл. почта", address: "Адрес", total: "Итого", quantity: "Количество",
  price: "Цена", customer: "Клиент", invoice: "Счёт", balance: "Баланс",
  active: "Активен", pending: "В ожидании", approved: "Одобрено", completed: "Завершено",
  paid: "Оплачено", overdue: "Просрочено",
  dashboard: "Панель", reports: "Отчёты", settings: "Настройки",
  inventory: "Склад", sales: "Продажи", purchases: "Закупки", customers: "Клиенты",
  products: "Товары", invoices: "Счета", payments: "Платежи",
  accounting: "Бухгалтерия", logout: "Выйти", login: "Войти", language: "Язык",
  tax: "Налог", discount: "Скидка", grand_total: "Общий итог",
};

const id: Record<string, string> = {
  save: "Simpan", cancel: "Batal", edit: "Ubah", delete: "Hapus", add: "Tambah",
  create: "Buat", update: "Perbarui", search: "Cari", export: "Ekspor",
  print: "Cetak", download: "Unduh", submit: "Kirim", confirm: "Konfirmasi",
  close: "Tutup", back: "Kembali", next: "Berikutnya", view: "Lihat", actions: "Aksi",
  loading: "Memuat...", no_data: "Tidak ada data", all: "Semua", yes: "Ya", no: "Tidak",
  date: "Tanggal", amount: "Jumlah", status: "Status", name: "Nama", phone: "Telepon",
  email: "Email", address: "Alamat", total: "Total", quantity: "Kuantitas",
  price: "Harga", customer: "Pelanggan", invoice: "Faktur", balance: "Saldo",
  active: "Aktif", pending: "Tertunda", approved: "Disetujui", completed: "Selesai",
  paid: "Dibayar", overdue: "Jatuh tempo",
  dashboard: "Dasbor", reports: "Laporan", settings: "Pengaturan",
  inventory: "Inventaris", sales: "Penjualan", purchases: "Pembelian", customers: "Pelanggan",
  products: "Produk", invoices: "Faktur", payments: "Pembayaran",
  accounting: "Akuntansi", logout: "Keluar", login: "Masuk", language: "Bahasa",
  tax: "Pajak", discount: "Diskon", grand_total: "Total keseluruhan",
};

const DICTIONARIES: Record<Locale, Record<string, string>> = { en, hi, te, ta, bn, ar, es, fr, de, pt, zh, ja, ru, id };

// ─── Context ─────────────────────────────────────────────────────────────────
interface I18nContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (l: Locale) => void;
  syncTenantLocale: () => void;
  t: (key: string) => string;
  formatCurrency: (n: number | string, currency?: string) => string;
  formatDate: (d: string | Date) => string;
  formatNumber: (n: number | string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en", dir: "ltr", setLocale: () => {}, syncTenantLocale: () => {}, t: (k) => k,
  formatCurrency: (n) => String(n), formatDate: (d) => String(d), formatNumber: (n) => String(n),
});

const STORAGE_KEY = "swacherp_locale";
const INTL_LOCALE: Record<Locale, string> = {
  en: "en-IN", hi: "hi-IN", te: "te-IN", ta: "ta-IN", bn: "bn-IN", ar: "ar-SA",
  es: "es-ES", fr: "fr-FR", de: "de-DE", pt: "pt-BR", zh: "zh-CN", ja: "ja-JP", ru: "ru-RU", id: "id-ID",
};

function applyDir(locale: Locale) {
  const meta = LOCALES.find((l) => l.code === locale)!;
  document.documentElement.dir = meta.dir;
  document.documentElement.lang = locale;
  document.documentElement.classList.toggle("rtl", meta.dir === "rtl");
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    return saved && DICTIONARIES[saved] ? saved : "en";
  });
  const [tenantCurrency, setTenantCurrency] = useState<string>("INR");

  // On first load with no saved preference, auto-apply the tenant's default locale
  // so GCC tenants (default_locale: "ar") get RTL automatically without manual switching.
  useEffect(() => {
    fetch("/api/tenant-config", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg: any) => {
        if (cfg?.currency_code) setTenantCurrency(cfg.currency_code);
        if (localStorage.getItem(STORAGE_KEY)) return; // user already chose a locale — respect it
        const tenantLocale = cfg?.default_locale as Locale | undefined;
        if (tenantLocale && DICTIONARIES[tenantLocale] && tenantLocale !== "en") {
          setLocaleState(tenantLocale);
        }
      })
      .catch(() => {});
  }, []);

  // Tenant-configurable translation overrides (custom terms per tenant/locale)
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  useEffect(() => {
    applyDir(locale);
    fetch(`/api/i18n/overrides?locale=${locale}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: any) => setOverrides(d?.overrides || {}))
      .catch(() => setOverrides({}));
  }, [locale]);

  const setLocale = (l: Locale) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLocaleState(l);
    // Persist tenant preference server-side, fire-and-forget
    fetch("/api/i18n/locale", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: l }),
    }).catch(() => {});
  };

  // Called after login to apply tenant's default locale/currency if user hasn't chosen one
  const syncTenantLocale = () => {
    fetch("/api/tenant-config", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg: any) => {
        if (cfg?.currency_code) setTenantCurrency(cfg.currency_code);
        if (localStorage.getItem(STORAGE_KEY)) return;
        const tenantLocale = cfg?.default_locale as Locale | undefined;
        if (tenantLocale && DICTIONARIES[tenantLocale] && tenantLocale !== "en") {
          setLocaleState(tenantLocale);
        }
      })
      .catch(() => {});
  };

  // Lookup order: tenant override → locale dictionary → English → raw key
  const t = (key: string) => overrides[key] ?? DICTIONARIES[locale][key] ?? en[key] ?? key;
  const dir = LOCALES.find((l) => l.code === locale)!.dir;

  const formatCurrency = (n: number | string, currency = tenantCurrency) =>
    new Intl.NumberFormat(INTL_LOCALE[locale], { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(n || 0));
  const formatDate = (d: string | Date) =>
    new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "medium" }).format(typeof d === "string" ? new Date(d) : d);
  const formatNumber = (n: number | string) =>
    new Intl.NumberFormat(INTL_LOCALE[locale]).format(Number(n || 0));

  return (
    <I18nContext.Provider value={{ locale, dir, setLocale, syncTenantLocale, t, formatCurrency, formatDate, formatNumber }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

// Shorthand: const t = useT();
export function useT() {
  return useContext(I18nContext).t;
}
