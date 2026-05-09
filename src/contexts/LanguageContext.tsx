import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'my' | 'th';

interface Translations {
  [key: string]: {
    [K in Language]: string;
  };
}

export const translations: Translations = {
  dashboard: {
    en: 'Dashboard',
    my: 'ဒက်ရှ်ဘုတ်',
    th: 'แผงควบคุม'
  },
  inventory: {
    en: 'Inventory',
    my: 'ကုန်ပစ္စည်းစာရင်း',
    th: 'คลังสินค้า'
  },
  sales: {
    en: 'Sales',
    my: 'အရောင်း',
    th: 'การขาย'
  },
  customers: {
    en: 'Customers',
    my: 'ဖောက်သည်များ',
    th: 'ลูกค้า'
  },
  reports: {
    en: 'Reports',
    my: 'အစီရင်ခံစာများ',
    th: 'รายงาน'
  },
  language_label: {
    en: 'Language',
    my: 'ဘာသာစကား',
    th: 'ภาษา'
  },
  system_operational: {
    en: 'System Operational',
    my: 'စနစ် ကောင်းမွန်စွာ အလုပ်လုပ်နေသည်',
    th: 'ระบบทำงานปกติ'
  },
  settings: {
    en: 'Settings',
    my: 'ဆက်တင်များ',
    th: 'การตั้งค่า'
  },
  'stock-checker': {
    en: 'Stock Checker',
    my: 'ပစ္စည်းစစ်ဆေးရန်',
    th: 'ตรวจสอบสต็อก'
  },
  installments: {
    en: 'Installments',
    my: 'အရစ်ကျငွေပေးချေမှု',
    th: 'การผ่อนชำระ'
  },
  suppliers: {
    en: 'Suppliers',
    my: 'ကုန်ပစ္စည်းပံ့ပိုးသူများ',
    th: 'ผู้จัดจำหน่าย'
  },
  branches: {
    en: 'Branches',
    my: 'ဆိုင်ခွဲများ',
    th: 'สาขา'
  },
  logout: {
    en: 'Logout',
    my: 'ထွက်ရန်',
    th: 'ออกจากระบบ'
  },
  system_time: {
    en: 'System Time',
    my: 'စနစ်အချိန်',
    th: 'เวลาของระบบ'
  },
  date: {
    en: 'Date',
    my: 'ရက်စွဲ',
    th: 'วันที่'
  },
  total_sales: {
    en: 'Revenue',
    my: 'စုစုပေါင်းအရေအတွက်',
    th: 'รายได้'
  },
  total_cost: {
    en: 'Total Cost',
    my: 'စုစုပေါင်းကုန်ကျစရိတ်',
    th: 'ต้นทุนทั้งหมด'
  },
  net_profit: {
    en: 'Net Profit',
    my: 'အသားတင်အမြတ်',
    th: 'กำไรสุทธิ'
  },
  orders: {
    en: 'Orders',
    my: 'အမှာစာများ',
    th: 'คำสั่งซื้อ'
  },
  average_ticket: {
    en: 'Avg. Ticket',
    my: 'ပျမ်းမျှရောင်းရငွေ',
    th: 'ยอดขายเฉลี่ย'
  },
  active_customers: {
    en: 'Active Customers',
    my: 'လက်ရှိဖောက်သည်များ',
    th: 'ลูกค้าที่มีความเคลื่อนไหว'
  },
  performance_by_branch: {
    en: 'Performance by Branch',
    my: 'ဆိုင်ခွဲအလိုက် လုပ်ဆောင်ချက်များ',
    th: 'ผลการดำเนินงานตามสาขา'
  },
  sales_performance: {
    en: 'Sales Performance',
    my: 'အရောင်းစွမ်းဆောင်ရည်',
    th: 'ประสิทธิภาพการขาย'
  },
  recent_sales_title: {
    en: 'Recent Sales',
    my: 'လတ်တလောအရောင်းများ',
    th: 'รายการขายล่าสุด'
  },
  current_branch: {
    en: 'Current Branch',
    my: 'လက်ရှိဆိုင်ခွဲ',
    th: 'สาขาปัจจุบัน'
  },
  all_branches: {
    en: 'ALL Branch',
    my: 'ဆိုင်ခွဲအားလုံး',
    th: 'ทุกสาขา'
  },
  login_title: {
    en: 'ZPOS',
    my: 'ZPOS မိုဘိုင်း POS',
    th: 'ZPOS โมบายล์ POS'
  },
  sign_in_btn: {
    en: 'Sign In to Dashboard',
    my: 'ဒက်ရှ်ဘုတ်သို့ ဝင်ရန်',
    th: 'เข้าสู่แผงควบคุม'
  },
  register_btn: {
    en: 'Create Store Account',
    my: 'စတိုးအကောင့်အသစ်ဖွင့်ရန်',
    th: 'สร้างบัญชีร้านค้า'
  },
  email_label: {
    en: 'Email Address',
    my: 'အီးမေးလ်လိပ်စာ',
    th: 'ที่อยู่อีเมล'
  },
  username_label: {
    en: 'User Name',
    my: 'အသုံးပြုသူအမည်',
    th: 'ชื่อผู้ใช้'
  },
  password_label: {
    en: 'Password',
    my: 'လျှို့ဝှက်နံပါတ်',
    th: 'รหัสผ่าน'
  },
  google_sign_in: {
    en: 'Sign in with Google',
    my: 'Google ဖြင့်ဝင်ရောက်ရန်',
    th: 'เข้าสู่ระบบด้วย Google'
  },
  register_prompt: {
    en: 'Already have an account? Sign In',
    my: 'အကောင့်ရှိပြီးသားလား? ဝင်ရောက်ရန်',
    th: 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ'
  },
  login_prompt: {
    en: 'Talent without work is nothing! Register Here',
    my: 'အကောင့်အသစ်ဖွင့်ရန် ဤနေရာကိုနှိပ်ပါ',
    th: 'พรสวรรค์ที่ปราศจากความพยายามก็ไร้ค่า! ลงทะเบียนที่นี่'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
