import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const LANGUAGES = [
  { code: 'en', nativeName: 'English', englishName: 'English', dir: 'ltr' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', dir: 'ltr' },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', dir: 'ltr' },
  { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi', dir: 'ltr' },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', dir: 'ltr' },
  { code: 'te', nativeName: 'తెలుగు', englishName: 'Telugu', dir: 'ltr' },
  { code: 'gu', nativeName: 'ગુજરાતી', englishName: 'Gujarati', dir: 'ltr' },
  { code: 'kn', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada', dir: 'ltr' },
  { code: 'ml', nativeName: 'മലയാളം', englishName: 'Malayalam', dir: 'ltr' },
  { code: 'pa', nativeName: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', dir: 'ltr' },
  { code: 'or', nativeName: 'ଓଡ଼ିଆ', englishName: 'Odia', dir: 'ltr' },
  { code: 'ur', nativeName: 'اردو', englishName: 'Urdu', dir: 'rtl' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

const en = {
  language: 'Language',
  paymentSafety: 'Payment safety',
  installApp: 'Install app',
  installed: 'Installed',
  homeEyebrow: 'PAYMENT PROTECTION',
  homeTitle: 'Check before you pay.',
  homeDescription: 'Scan a UPI QR to review the payment request before you continue.',
  localChecksAi: 'Local checks + AI when available',
  scanPaymentQr: 'Scan a payment QR',
  scanDescription: 'Check the payment details before you send money.',
  alignQr: 'Align the QR code inside the frame',
  keepCodeVisible: 'Keep the whole code visible. We will review the payment details before you continue.',
  startCameraScan: 'Start camera scan',
  scanning: 'Scanning…',
  stopScanning: 'Stop scanning',
  pasteUpiLink: 'Paste UPI link',
  uploadQrImage: 'Upload QR image',
  readingQr: 'Reading…',
  smsLink: 'Check SMS/Link',
  moreTools: 'More tools',
  toolsEyebrow: 'MORE FROM KAVACH',
  toolsTitle: 'Tools & insights',
  toolsDescription: 'Open a detailed payment report, train browser-only warning rules, or explore an illustrative fund-flow network.',
  truthTraceReport: 'TruthTrace report',
  truthTraceDescription: 'One featured tampered-QR example · evidence chain · before/after replay',
  demo: 'DEMO',
  patternMemory: 'Scam pattern memory',
  patternMemoryDescription: 'Approve and test local browser-only signature rules.',
  accuracyLab: 'Accuracy Lab',
  accuracyLabDescription: 'Measure errors on synthetic cases; compare context rules against simple keywords.',
  new: 'NEW',
  additionalVisualisations: 'Additional educational visualisations',
  fundFlowNetwork: 'Fund-flow network',
  fundFlowDescription: 'Illustrative network only — no bank transaction data.',
  hackathonDemoMode: 'Hackathon demo mode',
  openDemoControls: 'Open demo controls',
  messageCheckerTitle: 'Check a message or link',
  messageCheckerDescription: 'Paste one SMS, link or UPI request here. Get quick warning signs, then open TruthTrace only when you want the full payment-evidence report.',
  messageOrLink: 'Message or link',
  messagePlaceholder: 'Paste an SMS, WhatsApp message, email, website URL or UPI payment link…',
  checkForScams: 'Check for scams',
  optionalDetails: 'Optional details',
  privacyDisclaimer: 'Kavach is a prototype security aid, not a guarantee. It cannot automatically intercept every link in other apps, and website inspection requires separate backend support.',
  backSafetyReview: 'Back to safety review',
  highRiskDetails: 'High-risk payment details',
  noMajorWarnings: 'No major local warning signs',
  reviewCarefully: 'Review this payment carefully',
  preliminaryChecks: 'These are preliminary on-device checks only. Run the full safety check before opening a payment app.',
  localRiskScore: 'Local risk score',
  highRisk: 'HIGH RISK',
  lowIndicators: 'LOW INDICATORS',
  review: 'REVIEW',
  paying: 'Paying',
  recipientMissing: 'Recipient name not provided',
  showPaymentDetails: 'Show payment details',
  hidePaymentDetails: 'Hide payment details',
  cameraPermissionError: 'Camera permission is blocked. Allow Camera for this site in browser settings, then try again.',
  cameraUnavailable: 'No accessible camera was found. You can upload a QR image instead.',
  qrUnreadable: 'We could not read a QR code from this image. Try a clearer picture, or paste the UPI link manually.',
} as const;

export type MessageKey = keyof typeof en;
type Catalog = Partial<Record<MessageKey, string>>;

const translations: Record<Exclude<LanguageCode, 'en'>, Catalog> = {
  hi: {
    language: 'भाषा', paymentSafety: 'भुगतान सुरक्षा', installApp: 'ऐप इंस्टॉल करें', installed: 'इंस्टॉल है',
    homeEyebrow: 'भुगतान सुरक्षा', homeTitle: 'भुगतान से पहले जाँचें।', homeDescription: 'आगे बढ़ने से पहले भुगतान अनुरोध की जाँच के लिए UPI QR स्कैन करें।',
    localChecksAi: 'लोकल जाँच + उपलब्ध होने पर AI', scanPaymentQr: 'भुगतान QR स्कैन करें', scanDescription: 'पैसे भेजने से पहले भुगतान विवरण जाँचें।',
    alignQr: 'QR को फ्रेम के अंदर रखें', keepCodeVisible: 'पूरा QR कोड दिखाई देना चाहिए। आगे बढ़ने से पहले हम भुगतान विवरण दिखाएँगे।',
    startCameraScan: 'कैमरा स्कैन शुरू करें', scanning: 'स्कैन हो रहा है…', stopScanning: 'स्कैन रोकें', pasteUpiLink: 'UPI लिंक पेस्ट करें', uploadQrImage: 'QR इमेज अपलोड करें', readingQr: 'पढ़ रहे हैं…',
    smsLink: 'SMS/लिंक जाँचें', moreTools: 'अन्य टूल', toolsEyebrow: 'KAVACH के और टूल', toolsTitle: 'टूल और जानकारी', toolsDescription: 'भुगतान रिपोर्ट देखें, स्थानीय चेतावनी नियम जाँचें या पैसे के प्रवाह का उदाहरण देखें।',
    truthTraceReport: 'TruthTrace रिपोर्ट', truthTraceDescription: 'छेड़छाड़ किए गए QR का उदाहरण · सबूतों की कड़ी · पहले/बाद की तुलना', demo: 'डेमो',
    patternMemory: 'स्कैम पैटर्न मेमोरी', patternMemoryDescription: 'ब्राउज़र में स्थानीय नियमों को मंज़ूर करें और जाँचें।', accuracyLab: 'सटीकता लैब', accuracyLabDescription: 'बनाए गए उदाहरणों पर त्रुटियाँ मापें और संदर्भ नियमों की तुलना करें।', new: 'नया',
    additionalVisualisations: 'अन्य शैक्षिक दृश्य', fundFlowNetwork: 'पैसों के प्रवाह का नेटवर्क', fundFlowDescription: 'केवल उदाहरण — बैंक लेन-देन का डेटा नहीं।', hackathonDemoMode: 'हैकाथॉन डेमो मोड', openDemoControls: 'डेमो नियंत्रण खोलें',
    messageCheckerTitle: 'मैसेज या लिंक जाँचें', messageCheckerDescription: 'SMS, लिंक या UPI अनुरोध यहाँ पेस्ट करें। शुरुआती चेतावनियाँ देखें; पूरी भुगतान रिपोर्ट के लिए TruthTrace खोलें।',
    messageOrLink: 'मैसेज या लिंक', messagePlaceholder: 'SMS, WhatsApp संदेश, ईमेल, वेबसाइट URL या UPI भुगतान लिंक पेस्ट करें…', checkForScams: 'स्कैम जाँचें', optionalDetails: 'वैकल्पिक विवरण',
    privacyDisclaimer: 'Kavach एक सुरक्षा प्रोटोटाइप है, गारंटी नहीं। यह दूसरे ऐप्स में हर लिंक को अपने आप रोक नहीं सकता।', backSafetyReview: 'सुरक्षा जाँच पर लौटें',
    highRiskDetails: 'भुगतान में अधिक जोखिम', noMajorWarnings: 'स्थानीय जाँच में बड़ी चेतावनी नहीं', reviewCarefully: 'भुगतान को ध्यान से जाँचें', preliminaryChecks: 'ये केवल शुरुआती डिवाइस-जाँच हैं। भुगतान ऐप खोलने से पहले पूरी सुरक्षा जाँच करें।',
    localRiskScore: 'स्थानीय जोखिम स्कोर', highRisk: 'अधिक जोखिम', lowIndicators: 'कम संकेत', review: 'जाँचें', paying: 'भुगतान', recipientMissing: 'प्राप्तकर्ता का नाम नहीं दिया गया',
    showPaymentDetails: 'भुगतान विवरण दिखाएँ', hidePaymentDetails: 'भुगतान विवरण छिपाएँ',
    cameraPermissionError: 'कैमरा अनुमति बंद है। ब्राउज़र सेटिंग में इस साइट के लिए कैमरा अनुमति दें और फिर कोशिश करें।', cameraUnavailable: 'कैमरा उपलब्ध नहीं है। इसके बजाय QR इमेज अपलोड करें।', qrUnreadable: 'इस इमेज से QR नहीं पढ़ सके। साफ़ तस्वीर आज़माएँ या UPI लिंक पेस्ट करें।',
  },
  bn: {
    language: 'ভাষা', paymentSafety: 'পেমেন্ট সুরক্ষা', installApp: 'অ্যাপ ইনস্টল করুন', installed: 'ইনস্টল করা আছে',
    homeEyebrow: 'পেমেন্ট সুরক্ষা', homeTitle: 'পেমেন্টের আগে যাচাই করুন।', homeDescription: 'এগোনোর আগে পেমেন্টের অনুরোধ যাচাই করতে UPI QR স্ক্যান করুন।',
    localChecksAi: 'স্থানীয় যাচাই + AI পাওয়া গেলে', scanPaymentQr: 'পেমেন্ট QR স্ক্যান করুন', scanDescription: 'টাকা পাঠানোর আগে পেমেন্টের তথ্য যাচাই করুন।',
    alignQr: 'QR কোডটি ফ্রেমের মধ্যে রাখুন', keepCodeVisible: 'পুরো QR কোডটি দৃশ্যমান রাখুন। এগোনোর আগে পেমেন্টের তথ্য দেখানো হবে।',
    startCameraScan: 'ক্যামেরা স্ক্যান শুরু করুন', scanning: 'স্ক্যান হচ্ছে…', stopScanning: 'স্ক্যান বন্ধ করুন', pasteUpiLink: 'UPI লিঙ্ক পেস্ট করুন', uploadQrImage: 'QR ছবি আপলোড করুন', readingQr: 'পড়া হচ্ছে…',
    smsLink: 'SMS/লিঙ্ক যাচাই', moreTools: 'আরও টুল', toolsEyebrow: 'KAVACH-এর আরও', toolsTitle: 'টুল ও তথ্য', toolsDescription: 'পেমেন্ট রিপোর্ট দেখুন, স্থানীয় সতর্কতার নিয়ম যাচাই করুন অথবা অর্থপ্রবাহের উদাহরণ দেখুন।',
    truthTraceReport: 'TruthTrace রিপোর্ট', truthTraceDescription: 'বদলানো QR-এর উদাহরণ · প্রমাণের ধাপ · আগে ও পরে তুলনা', demo: 'ডেমো',
    patternMemory: 'স্ক্যাম প্যাটার্ন মেমরি', patternMemoryDescription: 'ব্রাউজারের স্থানীয় নিয়ম অনুমোদন ও পরীক্ষা করুন।', accuracyLab: 'নির্ভুলতা ল্যাব', accuracyLabDescription: 'নমুনা ঘটনার ভুল মাপুন এবং নিয়মের তুলনা করুন।', new: 'নতুন',
    additionalVisualisations: 'অতিরিক্ত শিক্ষামূলক দৃশ্য', fundFlowNetwork: 'অর্থপ্রবাহ নেটওয়ার্ক', fundFlowDescription: 'শুধু উদাহরণ — ব্যাঙ্ক লেনদেনের তথ্য নয়।', hackathonDemoMode: 'হ্যাকাথন ডেমো মোড', openDemoControls: 'ডেমো নিয়ন্ত্রণ খুলুন',
    messageCheckerTitle: 'বার্তা বা লিঙ্ক যাচাই করুন', messageCheckerDescription: 'এখানে SMS, লিঙ্ক বা UPI অনুরোধ পেস্ট করুন। সতর্কতার সংকেত দেখুন; পূর্ণ রিপোর্টের জন্য TruthTrace খুলুন।',
    messageOrLink: 'বার্তা বা লিঙ্ক', messagePlaceholder: 'SMS, WhatsApp বার্তা, ইমেল, ওয়েবসাইট URL বা UPI পেমেন্ট লিঙ্ক পেস্ট করুন…', checkForScams: 'স্ক্যাম যাচাই করুন', optionalDetails: 'ঐচ্ছিক তথ্য',
    privacyDisclaimer: 'Kavach একটি নিরাপত্তা প্রোটোটাইপ, নিশ্চয়তা নয়। এটি অন্য অ্যাপের সব লিঙ্ক স্বয়ংক্রিয়ভাবে আটকাতে পারে না।', backSafetyReview: 'নিরাপত্তা যাচাইয়ে ফিরুন',
    highRiskDetails: 'উচ্চ ঝুঁকির পেমেন্ট তথ্য', noMajorWarnings: 'স্থানীয় যাচাইয়ে বড় সতর্কতা নেই', reviewCarefully: 'পেমেন্ট সতর্কভাবে যাচাই করুন', preliminaryChecks: 'এগুলি কেবল প্রাথমিক ডিভাইস-ভিত্তিক যাচাই। পেমেন্ট অ্যাপ খোলার আগে সম্পূর্ণ নিরাপত্তা যাচাই করুন।',
    localRiskScore: 'স্থানীয় ঝুঁকি স্কোর', highRisk: 'উচ্চ ঝুঁকি', lowIndicators: 'কম সংকেত', review: 'যাচাই করুন', paying: 'পেমেন্ট করছেন', recipientMissing: 'প্রাপকের নাম দেওয়া নেই',
    showPaymentDetails: 'পেমেন্টের তথ্য দেখুন', hidePaymentDetails: 'পেমেন্টের তথ্য লুকান',
    cameraPermissionError: 'ক্যামেরার অনুমতি বন্ধ। ব্রাউজার সেটিংসে এই সাইটের জন্য ক্যামেরা অনুমতি দিন।', cameraUnavailable: 'কোনও ক্যামেরা পাওয়া যায়নি। বিকল্প হিসেবে QR ছবি আপলোড করুন।', qrUnreadable: 'এই ছবি থেকে QR পড়া যায়নি। পরিষ্কার ছবি নিন বা UPI লিঙ্ক পেস্ট করুন।',
  },
  mr: {
    language: 'भाषा', paymentSafety: 'पेमेंट सुरक्षा', installApp: 'अॅप इन्स्टॉल करा', installed: 'इन्स्टॉल केले',
    homeEyebrow: 'पेमेंट संरक्षण', homeTitle: 'पैसे देण्यापूर्वी तपासा.', homeDescription: 'पुढे जाण्यापूर्वी पेमेंट विनंती तपासण्यासाठी UPI QR स्कॅन करा.',
    localChecksAi: 'स्थानिक तपासणी + उपलब्ध असल्यास AI', scanPaymentQr: 'पेमेंट QR स्कॅन करा', scanDescription: 'पैसे पाठवण्यापूर्वी पेमेंट तपशील तपासा.',
    alignQr: 'QR कोड फ्रेममध्ये ठेवा', keepCodeVisible: 'संपूर्ण QR कोड दिसू द्या. पुढे जाण्यापूर्वी पेमेंट तपशील तपासले जातील.',
    startCameraScan: 'कॅमेरा स्कॅन सुरू करा', scanning: 'स्कॅन सुरू आहे…', stopScanning: 'स्कॅन थांबवा', pasteUpiLink: 'UPI लिंक पेस्ट करा', uploadQrImage: 'QR चित्र अपलोड करा', readingQr: 'वाचत आहे…',
    smsLink: 'SMS/लिंक तपासा', moreTools: 'अधिक टूल्स', toolsEyebrow: 'KAVACH मधील आणखी', toolsTitle: 'टूल्स आणि माहिती', toolsDescription: 'पेमेंट अहवाल, स्थानिक सूचना नियम किंवा पैशांच्या प्रवाहाचे उदाहरण पाहा.',
    truthTraceReport: 'TruthTrace अहवाल', truthTraceDescription: 'बदललेल्या QR चे उदाहरण · पुराव्यांची साखळी · आधी/नंतर तुलना', demo: 'डेमो',
    patternMemory: 'फसवणूक पॅटर्न मेमरी', patternMemoryDescription: 'ब्राउझरमधील स्थानिक नियम मंजूर करा आणि तपासा.', accuracyLab: 'अचूकता लॅब', accuracyLabDescription: 'नमुना प्रकरणांतील चुका मोजा आणि नियमांची तुलना करा.', new: 'नवीन',
    additionalVisualisations: 'अतिरिक्त शैक्षणिक दृश्ये', fundFlowNetwork: 'पैशांच्या प्रवाहाचे नेटवर्क', fundFlowDescription: 'फक्त उदाहरण — बँक व्यवहारांचा डेटा नाही.', hackathonDemoMode: 'हॅकाथॉन डेमो मोड', openDemoControls: 'डेमो नियंत्रणे उघडा',
    messageCheckerTitle: 'संदेश किंवा लिंक तपासा', messageCheckerDescription: 'SMS, लिंक किंवा UPI विनंती येथे पेस्ट करा. चेतावणीची चिन्हे पाहा; पूर्ण अहवालासाठी TruthTrace उघडा.',
    messageOrLink: 'संदेश किंवा लिंक', messagePlaceholder: 'SMS, WhatsApp संदेश, ईमेल, वेबसाइट URL किंवा UPI पेमेंट लिंक पेस्ट करा…', checkForScams: 'फसवणूक तपासा', optionalDetails: 'ऐच्छिक तपशील',
    privacyDisclaimer: 'Kavach हे सुरक्षा प्रोटोटाइप आहे, हमी नाही. इतर अॅपमधील प्रत्येक लिंक ते आपोआप अडवू शकत नाही.', backSafetyReview: 'सुरक्षा तपासणीकडे परत',
    highRiskDetails: 'उच्च-जोखमीचे पेमेंट तपशील', noMajorWarnings: 'स्थानिक तपासणीत मोठी सूचना नाही', reviewCarefully: 'पेमेंट काळजीपूर्वक तपासा', preliminaryChecks: 'या फक्त प्राथमिक डिव्हाइस तपासण्या आहेत. पेमेंट अॅप उघडण्यापूर्वी पूर्ण सुरक्षा तपासणी करा.',
    localRiskScore: 'स्थानिक जोखीम गुण', highRisk: 'उच्च जोखीम', lowIndicators: 'कमी संकेत', review: 'तपासा', paying: 'पेमेंट करत आहात', recipientMissing: 'प्राप्तकर्त्याचे नाव दिलेले नाही',
    showPaymentDetails: 'पेमेंट तपशील दाखवा', hidePaymentDetails: 'पेमेंट तपशील लपवा',
    cameraPermissionError: 'कॅमेरा परवानगी बंद आहे. ब्राउझर सेटिंगमध्ये या साइटसाठी कॅमेरा परवानगी द्या.', cameraUnavailable: 'कॅमेरा उपलब्ध नाही. QR चित्र अपलोड करा.', qrUnreadable: 'या चित्रातून QR वाचता आला नाही. स्पष्ट चित्र वापरा किंवा UPI लिंक पेस्ट करा.',
  },
  ta: {
    language: 'மொழி', paymentSafety: 'கட்டணப் பாதுகாப்பு', installApp: 'செயலியை நிறுவு', installed: 'நிறுவப்பட்டது',
    homeEyebrow: 'கட்டணப் பாதுகாப்பு', homeTitle: 'பணம் செலுத்தும் முன் சரிபார்க்கவும்.', homeDescription: 'தொடர்வதற்கு முன் கட்டணக் கோரிக்கையைப் பார்க்க UPI QR-ஐ ஸ்கேன் செய்யுங்கள்.',
    localChecksAi: 'உள்ளூர் சோதனைகள் + கிடைத்தால் AI', scanPaymentQr: 'கட்டண QR-ஐ ஸ்கேன் செய்', scanDescription: 'பணம் அனுப்பும் முன் கட்டண விவரங்களைச் சரிபார்க்கவும்.',
    alignQr: 'QR குறியீட்டை சட்டகத்துக்குள் வைக்கவும்', keepCodeVisible: 'முழு QR குறியீடும் தெரிய வேண்டும். தொடர்வதற்கு முன் கட்டண விவரங்களைப் பார்ப்பீர்கள்.',
    startCameraScan: 'கேமரா ஸ்கேனைத் தொடங்கு', scanning: 'ஸ்கேன் செய்கிறது…', stopScanning: 'ஸ்கேனை நிறுத்து', pasteUpiLink: 'UPI இணைப்பை ஒட்டு', uploadQrImage: 'QR படத்தைப் பதிவேற்று', readingQr: 'படிக்கிறது…',
    smsLink: 'SMS/இணைப்பைச் சரிபார்', moreTools: 'மேலும் கருவிகள்', toolsEyebrow: 'KAVACH-இல் மேலும்', toolsTitle: 'கருவிகள் மற்றும் தகவல்கள்', toolsDescription: 'கட்டண அறிக்கையைப் பாருங்கள், உள்ளூர் எச்சரிக்கை விதிகளைச் சோதிக்கவும் அல்லது பணப்போக்கு உதாரணத்தைப் பார்க்கவும்.',
    truthTraceReport: 'TruthTrace அறிக்கை', truthTraceDescription: 'மாற்றப்பட்ட QR உதாரணம் · ஆதாரத் தொடர் · முன்/பின் ஒப்பீடு', demo: 'டெமோ',
    patternMemory: 'மோசடி முறை நினைவகம்', patternMemoryDescription: 'உலாவியில் உள்ள உள்ளூர் விதிகளை ஒப்புதல் அளித்து சோதிக்கவும்.', accuracyLab: 'துல்லிய ஆய்வகம்', accuracyLabDescription: 'மாதிரி நிகழ்வுகளில் பிழைகளை அளந்து விதிகளை ஒப்பிடவும்.', new: 'புதியது',
    additionalVisualisations: 'கூடுதல் கற்றல் காட்சிகள்', fundFlowNetwork: 'பணப்போக்கு வலை', fundFlowDescription: 'விளக்கத்திற்கான மாதிரி மட்டுமே — வங்கிப் பரிவர்த்தனைத் தரவு இல்லை.', hackathonDemoMode: 'ஹேக்கத்தான் டெமோ முறை', openDemoControls: 'டெமோ கட்டுப்பாடுகளைத் திற',
    messageCheckerTitle: 'செய்தி அல்லது இணைப்பைச் சரிபார்', messageCheckerDescription: 'SMS, இணைப்பு அல்லது UPI கோரிக்கையை இங்கே ஒட்டவும். எச்சரிக்கை அறிகுறிகளைப் பார்க்கவும்; முழு அறிக்கைக்கு TruthTrace-ஐத் திறக்கவும்.',
    messageOrLink: 'செய்தி அல்லது இணைப்பு', messagePlaceholder: 'SMS, WhatsApp செய்தி, மின்னஞ்சல், இணையதள URL அல்லது UPI கட்டண இணைப்பை ஒட்டவும்…', checkForScams: 'மோசடியைச் சரிபார்', optionalDetails: 'விருப்ப விவரங்கள்',
    privacyDisclaimer: 'Kavach ஒரு பாதுகாப்பு முன்னோடி அமைப்பு; உத்தரவாதம் அல்ல. மற்ற செயலிகளில் உள்ள எல்லா இணைப்புகளையும் தானாகத் தடுக்காது.', backSafetyReview: 'பாதுகாப்பு சோதனைக்குத் திரும்பு',
    highRiskDetails: 'அதிக ஆபத்துள்ள கட்டண விவரங்கள்', noMajorWarnings: 'முக்கிய உள்ளூர் எச்சரிக்கை இல்லை', reviewCarefully: 'இந்தக் கட்டணத்தை கவனமாகச் சரிபார்க்கவும்', preliminaryChecks: 'இவை சாதனத்தில் செய்யப்படும் ஆரம்பச் சோதனைகள் மட்டுமே. கட்டண செயலியைத் திறக்கும் முன் முழு பாதுகாப்புச் சோதனையைச் செய்யவும்.',
    localRiskScore: 'உள்ளூர் ஆபத்து மதிப்பெண்', highRisk: 'அதிக ஆபத்து', lowIndicators: 'குறைந்த அறிகுறிகள்', review: 'சரிபார்', paying: 'செலுத்துவது', recipientMissing: 'பெறுநர் பெயர் வழங்கப்படவில்லை',
    showPaymentDetails: 'கட்டண விவரங்களைக் காட்டு', hidePaymentDetails: 'கட்டண விவரங்களை மறை',
    cameraPermissionError: 'கேமரா அனுமதி முடக்கப்பட்டுள்ளது. உலாவி அமைப்புகளில் இந்தத் தளத்திற்கு கேமரா அனுமதி அளிக்கவும்.', cameraUnavailable: 'கேமரா கிடைக்கவில்லை. QR படத்தைப் பதிவேற்றலாம்.', qrUnreadable: 'இந்தப் படத்தில் QR-ஐப் படிக்க முடியவில்லை. தெளிவான படத்தை முயற்சிக்கவும் அல்லது UPI இணைப்பை ஒட்டவும்.',
  },
  te: {
    language: 'భాష', paymentSafety: 'చెల్లింపు భద్రత', installApp: 'యాప్‌ను ఇన్‌స్టాల్ చేయండి', installed: 'ఇన్‌స్టాల్ అయింది',
    homeEyebrow: 'చెల్లింపు రక్షణ', homeTitle: 'చెల్లించే ముందు తనిఖీ చేయండి.', homeDescription: 'కొనసాగించే ముందు చెల్లింపు అభ్యర్థనను చూడటానికి UPI QR స్కాన్ చేయండి.',
    localChecksAi: 'స్థానిక తనిఖీలు + అందుబాటులో ఉంటే AI', scanPaymentQr: 'చెల్లింపు QR స్కాన్ చేయండి', scanDescription: 'డబ్బు పంపే ముందు చెల్లింపు వివరాలు తనిఖీ చేయండి.',
    alignQr: 'QR కోడ్‌ను ఫ్రేమ్‌లో ఉంచండి', keepCodeVisible: 'మొత్తం QR కోడ్ కనిపించేలా ఉంచండి. కొనసాగించే ముందు చెల్లింపు వివరాలను చూపిస్తాము.',
    startCameraScan: 'కెమెరా స్కాన్ ప్రారంభించండి', scanning: 'స్కాన్ అవుతోంది…', stopScanning: 'స్కాన్ ఆపండి', pasteUpiLink: 'UPI లింక్‌ను పేస్ట్ చేయండి', uploadQrImage: 'QR చిత్రాన్ని అప్‌లోడ్ చేయండి', readingQr: 'చదువుతోంది…',
    smsLink: 'SMS/లింక్ తనిఖీ', moreTools: 'మరిన్ని సాధనాలు', toolsEyebrow: 'KAVACH నుంచి మరిన్ని', toolsTitle: 'సాధనాలు మరియు సమాచారం', toolsDescription: 'చెల్లింపు నివేదికను తెరవండి, స్థానిక హెచ్చరిక నియమాలను పరీక్షించండి లేదా నిధుల ప్రవాహ ఉదాహరణను చూడండి.',
    truthTraceReport: 'TruthTrace నివేదిక', truthTraceDescription: 'మార్చిన QR ఉదాహరణ · ఆధారాల క్రమం · ముందు/తర్వాత పోలిక', demo: 'డెమో',
    patternMemory: 'మోసపు నమూనాల మెమరీ', patternMemoryDescription: 'బ్రౌజర్‌లోని స్థానిక నియమాలను ఆమోదించి పరీక్షించండి.', accuracyLab: 'ఖచ్చితత్వ ప్రయోగశాల', accuracyLabDescription: 'నమూనా సందర్భాల్లో లోపాలను కొలిచి నియమాలను పోల్చండి.', new: 'కొత్తది',
    additionalVisualisations: 'అదనపు విద్యా దృశ్యాలు', fundFlowNetwork: 'నిధుల ప్రవాహ నెట్‌వర్క్', fundFlowDescription: 'ఉదాహరణ మాత్రమే — బ్యాంకు లావాదేవీ డేటా కాదు.', hackathonDemoMode: 'హ్యాకథాన్ డెమో మోడ్', openDemoControls: 'డెమో నియంత్రణలు తెరవండి',
    messageCheckerTitle: 'సందేశం లేదా లింక్‌ను తనిఖీ చేయండి', messageCheckerDescription: 'SMS, లింక్ లేదా UPI అభ్యర్థనను ఇక్కడ పేస్ట్ చేయండి. హెచ్చరిక సూచనలను చూడండి; పూర్తి నివేదిక కోసం TruthTrace తెరవండి.',
    messageOrLink: 'సందేశం లేదా లింక్', messagePlaceholder: 'SMS, WhatsApp సందేశం, ఇమెయిల్, వెబ్‌సైట్ URL లేదా UPI చెల్లింపు లింక్‌ను పేస్ట్ చేయండి…', checkForScams: 'మోసాలను తనిఖీ చేయండి', optionalDetails: 'ఐచ్ఛిక వివరాలు',
    privacyDisclaimer: 'Kavach భద్రతా నమూనా మాత్రమే, హామీ కాదు. ఇతర యాప్‌లలోని ప్రతి లింక్‌ను స్వయంచాలకంగా ఆపలేదు.', backSafetyReview: 'భద్రతా తనిఖీకి తిరిగి వెళ్లండి',
    highRiskDetails: 'అధిక ప్రమాద చెల్లింపు వివరాలు', noMajorWarnings: 'స్థానిక తనిఖీలో పెద్ద హెచ్చరికలు లేవు', reviewCarefully: 'ఈ చెల్లింపును జాగ్రత్తగా పరిశీలించండి', preliminaryChecks: 'ఇవి పరికరంలో చేసే ప్రాథమిక తనిఖీలు మాత్రమే. చెల్లింపు యాప్ తెరవడానికి ముందు పూర్తి భద్రతా తనిఖీ చేయండి.',
    localRiskScore: 'స్థానిక ప్రమాద స్కోరు', highRisk: 'అధిక ప్రమాదం', lowIndicators: 'తక్కువ సూచనలు', review: 'పరిశీలించండి', paying: 'చెల్లిస్తున్నది', recipientMissing: 'గ్రహీత పేరు ఇవ్వలేదు',
    showPaymentDetails: 'చెల్లింపు వివరాలు చూపించు', hidePaymentDetails: 'చెల్లింపు వివరాలు దాచు',
    cameraPermissionError: 'కెమెరా అనుమతి నిలిపివేయబడింది. బ్రౌజర్ సెట్టింగ్‌లలో ఈ సైట్‌కు కెమెరా అనుమతి ఇవ్వండి.', cameraUnavailable: 'కెమెరా అందుబాటులో లేదు. బదులుగా QR చిత్రాన్ని అప్‌లోడ్ చేయండి.', qrUnreadable: 'ఈ చిత్రం నుంచి QR చదవలేకపోయాం. స్పష్టమైన చిత్రాన్ని ప్రయత్నించండి లేదా UPI లింక్‌ను పేస్ట్ చేయండి.',
  },
  gu: {
    language: 'ભાષા', paymentSafety: 'ચુકવણી સુરક્ષા', installApp: 'ઍપ ઇન્સ્ટોલ કરો', installed: 'ઇન્સ્ટોલ થઈ ગઈ',
    homeEyebrow: 'ચુકવણી સુરક્ષા', homeTitle: 'ચુકવણી પહેલાં તપાસો.', homeDescription: 'આગળ વધતાં પહેલાં ચુકવણી વિનંતી તપાસવા UPI QR સ્કૅન કરો.',
    localChecksAi: 'સ્થાનિક તપાસ + ઉપલબ્ધ હોય ત્યારે AI', scanPaymentQr: 'ચુકવણી QR સ્કૅન કરો', scanDescription: 'પૈસા મોકલતાં પહેલાં ચુકવણીની વિગતો તપાસો.',
    alignQr: 'QR કોડને ફ્રેમની અંદર રાખો', keepCodeVisible: 'આખો QR કોડ દેખાતો રાખો. આગળ વધતાં પહેલાં ચુકવણીની વિગતો બતાવવામાં આવશે.',
    startCameraScan: 'કૅમેરા સ્કૅન શરૂ કરો', scanning: 'સ્કૅન થઈ રહ્યું છે…', stopScanning: 'સ્કૅન બંધ કરો', pasteUpiLink: 'UPI લિંક પેસ્ટ કરો', uploadQrImage: 'QR છબી અપલોડ કરો', readingQr: 'વાંચી રહ્યા છીએ…',
    smsLink: 'SMS/લિંક તપાસો', moreTools: 'વધુ સાધનો', toolsEyebrow: 'KAVACH તરફથી વધુ', toolsTitle: 'સાધનો અને માહિતી', toolsDescription: 'ચુકવણી રિપોર્ટ જુઓ, સ્થાનિક ચેતવણીના નિયમો તપાસો અથવા નાણાંના પ્રવાહનું ઉદાહરણ જુઓ.',
    truthTraceReport: 'TruthTrace રિપોર્ટ', truthTraceDescription: 'બદલાયેલા QRનું ઉદાહરણ · પુરાવાની કડી · પહેલાં/પછી સરખામણી', demo: 'ડેમો',
    patternMemory: 'છેતરપિંડી પેટર્ન મેમરી', patternMemoryDescription: 'બ્રાઉઝરમાં સ્થાનિક નિયમોને મંજૂરી આપો અને તપાસો.', accuracyLab: 'ચોકસાઈ લૅબ', accuracyLabDescription: 'નમૂના કેસોમાં ભૂલો માપો અને નિયમોની તુલના કરો.', new: 'નવું',
    additionalVisualisations: 'વધારાના શૈક્ષણિક દૃશ્યો', fundFlowNetwork: 'નાણાંના પ્રવાહનું નેટવર્ક', fundFlowDescription: 'માત્ર ઉદાહરણ — બેંક વ્યવહારનો ડેટા નથી.', hackathonDemoMode: 'હેકાથોન ડેમો મોડ', openDemoControls: 'ડેમો નિયંત્રણો ખોલો',
    messageCheckerTitle: 'સંદેશ અથવા લિંક તપાસો', messageCheckerDescription: 'SMS, લિંક અથવા UPI વિનંતી અહીં પેસ્ટ કરો. ચેતવણીનાં સંકેતો જુઓ; સંપૂર્ણ રિપોર્ટ માટે TruthTrace ખોલો.',
    messageOrLink: 'સંદેશ અથવા લિંક', messagePlaceholder: 'SMS, WhatsApp સંદેશ, ઇમેઇલ, વેબસાઇટ URL અથવા UPI ચુકવણી લિંક પેસ્ટ કરો…', checkForScams: 'છેતરપિંડી તપાસો', optionalDetails: 'વૈકલ્પિક વિગતો',
    privacyDisclaimer: 'Kavach સુરક્ષા પ્રોટોટાઇપ છે, ખાતરી નહીં. તે બીજી ઍપની દરેક લિંક આપમેળે રોકી શકતું નથી.', backSafetyReview: 'સુરક્ષા તપાસ પર પાછા જાઓ',
    highRiskDetails: 'ઊંચા જોખમની ચુકવણી વિગતો', noMajorWarnings: 'સ્થાનિક તપાસમાં મોટી ચેતવણી નથી', reviewCarefully: 'ચુકવણી કાળજીપૂર્વક તપાસો', preliminaryChecks: 'આ માત્ર પ્રાથમિક ઉપકરણ તપાસ છે. ચુકવણી ઍપ ખોલતાં પહેલાં સંપૂર્ણ સુરક્ષા તપાસ કરો.',
    localRiskScore: 'સ્થાનિક જોખમ સ્કોર', highRisk: 'ઊંચું જોખમ', lowIndicators: 'ઓછા સંકેતો', review: 'તપાસો', paying: 'ચુકવણી', recipientMissing: 'પ્રાપ્તકર્તાનું નામ આપ્યું નથી',
    showPaymentDetails: 'ચુકવણીની વિગતો બતાવો', hidePaymentDetails: 'ચુકવણીની વિગતો છુપાવો',
    cameraPermissionError: 'કૅમેરાની મંજૂરી બંધ છે. બ્રાઉઝર સેટિંગમાં આ સાઇટ માટે મંજૂરી આપો.', cameraUnavailable: 'કૅમેરા મળ્યો નથી. તેના બદલે QR છબી અપલોડ કરો.', qrUnreadable: 'આ છબીમાંથી QR વાંચી શકાયો નથી. સ્પષ્ટ છબી અજમાવો અથવા UPI લિંક પેસ્ટ કરો.',
  },
  kn: {
    language: 'ಭಾಷೆ', paymentSafety: 'ಪಾವತಿ ಸುರಕ್ಷತೆ', installApp: 'ಆ್ಯಪ್ ಸ್ಥಾಪಿಸಿ', installed: 'ಸ್ಥಾಪಿಸಲಾಗಿದೆ',
    homeEyebrow: 'ಪಾವತಿ ರಕ್ಷಣೆ', homeTitle: 'ಪಾವತಿಸುವ ಮೊದಲು ಪರಿಶೀಲಿಸಿ.', homeDescription: 'ಮುಂದುವರಿಯುವ ಮೊದಲು ಪಾವತಿ ವಿನಂತಿಯನ್ನು ಪರಿಶೀಲಿಸಲು UPI QR ಸ್ಕ್ಯಾನ್ ಮಾಡಿ.',
    localChecksAi: 'ಸ್ಥಳೀಯ ಪರಿಶೀಲನೆ + ಲಭ್ಯವಿದ್ದರೆ AI', scanPaymentQr: 'ಪಾವತಿ QR ಸ್ಕ್ಯಾನ್ ಮಾಡಿ', scanDescription: 'ಹಣ ಕಳುಹಿಸುವ ಮೊದಲು ಪಾವತಿ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.',
    alignQr: 'QR ಕೋಡ್ ಅನ್ನು ಚೌಕಟ್ಟಿನೊಳಗೆ ಇರಿಸಿ', keepCodeVisible: 'ಪೂರ್ಣ QR ಕೋಡ್ ಕಾಣುವಂತೆ ಇರಿಸಿ. ಮುಂದುವರಿಯುವ ಮೊದಲು ಪಾವತಿ ವಿವರಗಳನ್ನು ತೋರಿಸುತ್ತೇವೆ.',
    startCameraScan: 'ಕ್ಯಾಮೆರಾ ಸ್ಕ್ಯಾನ್ ಪ್ರಾರಂಭಿಸಿ', scanning: 'ಸ್ಕ್ಯಾನ್ ಆಗುತ್ತಿದೆ…', stopScanning: 'ಸ್ಕ್ಯಾನ್ ನಿಲ್ಲಿಸಿ', pasteUpiLink: 'UPI ಲಿಂಕ್ ಅಂಟಿಸಿ', uploadQrImage: 'QR ಚಿತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ', readingQr: 'ಓದುತ್ತಿದೆ…',
    smsLink: 'SMS/ಲಿಂಕ್ ಪರಿಶೀಲಿಸಿ', moreTools: 'ಹೆಚ್ಚಿನ ಸಾಧನಗಳು', toolsEyebrow: 'KAVACH ನಿಂದ ಇನ್ನಷ್ಟು', toolsTitle: 'ಸಾಧನಗಳು ಮತ್ತು ಮಾಹಿತಿ', toolsDescription: 'ಪಾವತಿ ವರದಿ ತೆರೆಯಿರಿ, ಸ್ಥಳೀಯ ಎಚ್ಚರಿಕೆ ನಿಯಮಗಳನ್ನು ಪರೀಕ್ಷಿಸಿ ಅಥವಾ ಹಣದ ಹರಿವಿನ ಉದಾಹರಣೆ ನೋಡಿ.',
    truthTraceReport: 'TruthTrace ವರದಿ', truthTraceDescription: 'ಬದಲಿಸಿದ QR ಉದಾಹರಣೆ · ಸಾಕ್ಷ್ಯ ಸರಣಿ · ಮೊದಲು/ನಂತರ ಹೋಲಿಕೆ', demo: 'ಡೆಮೊ',
    patternMemory: 'ವಂಚನೆ ಮಾದರಿ ನೆನಪು', patternMemoryDescription: 'ಬ್ರೌಸರ್‌ನ ಸ್ಥಳೀಯ ನಿಯಮಗಳನ್ನು ಅನುಮೋದಿಸಿ ಪರೀಕ್ಷಿಸಿ.', accuracyLab: 'ನಿಖರತೆ ಪ್ರಯೋಗಾಲಯ', accuracyLabDescription: 'ಮಾದರಿ ಪ್ರಕರಣಗಳಲ್ಲಿನ ದೋಷಗಳನ್ನು ಅಳೆದು ನಿಯಮಗಳನ್ನು ಹೋಲಿಸಿ.', new: 'ಹೊಸದು',
    additionalVisualisations: 'ಹೆಚ್ಚುವರಿ ಶೈಕ್ಷಣಿಕ ದೃಶ್ಯಗಳು', fundFlowNetwork: 'ಹಣದ ಹರಿವಿನ ಜಾಲ', fundFlowDescription: 'ಉದಾಹರಣೆ ಮಾತ್ರ — ಬ್ಯಾಂಕ್ ವ್ಯವಹಾರದ ಡೇಟಾ ಇಲ್ಲ.', hackathonDemoMode: 'ಹ್ಯಾಕಥಾನ್ ಡೆಮೊ ಮೋಡ್', openDemoControls: 'ಡೆಮೊ ನಿಯಂತ್ರಣಗಳನ್ನು ತೆರೆಯಿರಿ',
    messageCheckerTitle: 'ಸಂದೇಶ ಅಥವಾ ಲಿಂಕ್ ಪರಿಶೀಲಿಸಿ', messageCheckerDescription: 'SMS, ಲಿಂಕ್ ಅಥವಾ UPI ವಿನಂತಿಯನ್ನು ಇಲ್ಲಿ ಅಂಟಿಸಿ. ಎಚ್ಚರಿಕೆ ಸೂಚನೆಗಳನ್ನು ನೋಡಿ; ಪೂರ್ಣ ವರದಿಗೆ TruthTrace ತೆರೆಯಿರಿ.',
    messageOrLink: 'ಸಂದೇಶ ಅಥವಾ ಲಿಂಕ್', messagePlaceholder: 'SMS, WhatsApp ಸಂದೇಶ, ಇಮೇಲ್, ವೆಬ್‌ಸೈಟ್ URL ಅಥವಾ UPI ಪಾವತಿ ಲಿಂಕ್ ಅಂಟಿಸಿ…', checkForScams: 'ವಂಚನೆ ಪರಿಶೀಲಿಸಿ', optionalDetails: 'ಐಚ್ಛಿಕ ವಿವರಗಳು',
    privacyDisclaimer: 'Kavach ಭದ್ರತಾ ಮಾದರಿ ಮಾತ್ರ, ಖಾತರಿ ಅಲ್ಲ. ಬೇರೆ ಆ್ಯಪ್‌ಗಳಲ್ಲಿನ ಪ್ರತಿಯೊಂದು ಲಿಂಕ್ ಅನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ತಡೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ.', backSafetyReview: 'ಭದ್ರತಾ ಪರಿಶೀಲನೆಗೆ ಹಿಂತಿರುಗಿ',
    highRiskDetails: 'ಹೆಚ್ಚಿನ ಅಪಾಯದ ಪಾವತಿ ವಿವರಗಳು', noMajorWarnings: 'ಸ್ಥಳೀಯ ಪರಿಶೀಲನೆಯಲ್ಲಿ ಪ್ರಮುಖ ಎಚ್ಚರಿಕೆ ಇಲ್ಲ', reviewCarefully: 'ಈ ಪಾವತಿಯನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ಪರಿಶೀಲಿಸಿ', preliminaryChecks: 'ಇವು ಪ್ರಾಥಮಿಕ ಸಾಧನ ಪರಿಶೀಲನೆಗಳು ಮಾತ್ರ. ಪಾವತಿ ಆ್ಯಪ್ ತೆರೆಯುವ ಮೊದಲು ಸಂಪೂರ್ಣ ಭದ್ರತಾ ಪರಿಶೀಲನೆ ಮಾಡಿ.',
    localRiskScore: 'ಸ್ಥಳೀಯ ಅಪಾಯ ಅಂಕ', highRisk: 'ಹೆಚ್ಚಿನ ಅಪಾಯ', lowIndicators: 'ಕಡಿಮೆ ಸೂಚನೆಗಳು', review: 'ಪರಿಶೀಲಿಸಿ', paying: 'ಪಾವತಿ', recipientMissing: 'ಸ್ವೀಕರಿಸುವವರ ಹೆಸರು ನೀಡಿಲ್ಲ',
    showPaymentDetails: 'ಪಾವತಿ ವಿವರಗಳನ್ನು ತೋರಿಸಿ', hidePaymentDetails: 'ಪಾವತಿ ವಿವರಗಳನ್ನು ಮರೆಮಾಡಿ',
    cameraPermissionError: 'ಕ್ಯಾಮೆರಾ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ಬ್ರೌಸರ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಈ ಸೈಟ್‌ಗೆ ಅನುಮತಿ ನೀಡಿ.', cameraUnavailable: 'ಕ್ಯಾಮೆರಾ ಲಭ್ಯವಿಲ್ಲ. ಬದಲಿಗೆ QR ಚಿತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.', qrUnreadable: 'ಈ ಚಿತ್ರದಿಂದ QR ಓದಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಸ್ಪಷ್ಟ ಚಿತ್ರ ಬಳಸಿ ಅಥವಾ UPI ಲಿಂಕ್ ಅಂಟಿಸಿ.',
  },
  ml: {
    language: 'ഭാഷ', paymentSafety: 'പേയ്മെന്റ് സുരക്ഷ', installApp: 'ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യുക', installed: 'ഇൻസ്റ്റാൾ ചെയ്തു',
    homeEyebrow: 'പേയ്മെന്റ് സംരക്ഷണം', homeTitle: 'പണം അയയ്ക്കും മുമ്പ് പരിശോധിക്കുക.', homeDescription: 'തുടരുന്നതിന് മുമ്പ് പേയ്മെന്റ് അഭ്യർത്ഥന പരിശോധിക്കാൻ UPI QR സ്കാൻ ചെയ്യുക.',
    localChecksAi: 'പ്രാദേശിക പരിശോധന + ലഭ്യമെങ്കിൽ AI', scanPaymentQr: 'പേയ്മെന്റ് QR സ്കാൻ ചെയ്യുക', scanDescription: 'പണം അയയ്ക്കുന്നതിന് മുമ്പ് പേയ്മെന്റ് വിവരങ്ങൾ പരിശോധിക്കുക.',
    alignQr: 'QR കോഡ് ഫ്രെയിമിനുള്ളിൽ വയ്ക്കുക', keepCodeVisible: 'മുഴുവൻ QR കോഡും കാണണം. തുടരുന്നതിന് മുമ്പ് പേയ്മെന്റ് വിവരങ്ങൾ പരിശോധിക്കും.',
    startCameraScan: 'ക്യാമറ സ്കാൻ ആരംഭിക്കുക', scanning: 'സ്കാൻ ചെയ്യുന്നു…', stopScanning: 'സ്കാൻ നിർത്തുക', pasteUpiLink: 'UPI ലിങ്ക് ഒട്ടിക്കുക', uploadQrImage: 'QR ചിത്രം അപ്‌ലോഡ് ചെയ്യുക', readingQr: 'വായിക്കുന്നു…',
    smsLink: 'SMS/ലിങ്ക് പരിശോധിക്കുക', moreTools: 'കൂടുതൽ ഉപകരണങ്ങൾ', toolsEyebrow: 'KAVACH-ൽ കൂടുതൽ', toolsTitle: 'ഉപകരണങ്ങളും വിവരങ്ങളും', toolsDescription: 'പേയ്മെന്റ് റിപ്പോർട്ട് കാണുക, പ്രാദേശിക മുന്നറിയിപ്പ് നിയമങ്ങൾ പരിശോധിക്കുക, അല്ലെങ്കിൽ പണത്തിന്റെ ഒഴുക്ക് ഉദാഹരണം കാണുക.',
    truthTraceReport: 'TruthTrace റിപ്പോർട്ട്', truthTraceDescription: 'മാറ്റം വരുത്തിയ QR ഉദാഹരണം · തെളിവുകളുടെ ക്രമം · മുമ്പും ശേഷവും', demo: 'ഡെമോ',
    patternMemory: 'തട്ടിപ്പ് പാറ്റേൺ മെമ്മറി', patternMemoryDescription: 'ബ്രൗസറിലെ പ്രാദേശിക നിയമങ്ങൾ അംഗീകരിച്ച് പരീക്ഷിക്കുക.', accuracyLab: 'കൃത്യത ലാബ്', accuracyLabDescription: 'സാമ്പിൾ കേസുകളിലെ പിശകുകൾ അളന്ന് നിയമങ്ങൾ താരതമ്യം ചെയ്യുക.', new: 'പുതിയത്',
    additionalVisualisations: 'കൂടുതൽ പഠന ദൃശ്യങ്ങൾ', fundFlowNetwork: 'പണത്തിന്റെ ഒഴുക്ക് ശൃംഖല', fundFlowDescription: 'ഉദാഹരണം മാത്രം — ബാങ്ക് ഇടപാട് വിവരങ്ങളില്ല.', hackathonDemoMode: 'ഹാക്കത്തോൺ ഡെമോ മോഡ്', openDemoControls: 'ഡെമോ നിയന്ത്രണങ്ങൾ തുറക്കുക',
    messageCheckerTitle: 'സന്ദേശമോ ലിങ്കോ പരിശോധിക്കുക', messageCheckerDescription: 'SMS, ലിങ്ക് അല്ലെങ്കിൽ UPI അഭ്യർത്ഥന ഇവിടെ ഒട്ടിക്കുക. മുന്നറിയിപ്പുകൾ കാണുക; പൂർണ്ണ റിപ്പോർട്ടിന് TruthTrace തുറക്കുക.',
    messageOrLink: 'സന്ദേശം അല്ലെങ്കിൽ ലിങ്ക്', messagePlaceholder: 'SMS, WhatsApp സന്ദേശം, ഇമെയിൽ, വെബ്സൈറ്റ് URL അല്ലെങ്കിൽ UPI പേയ്മെന്റ് ലിങ്ക് ഒട്ടിക്കുക…', checkForScams: 'തട്ടിപ്പ് പരിശോധിക്കുക', optionalDetails: 'ഐച്ഛിക വിവരങ്ങൾ',
    privacyDisclaimer: 'Kavach ഒരു സുരക്ഷാ പ്രോട്ടോടൈപ്പ് മാത്രമാണ്, ഉറപ്പല്ല. മറ്റ് ആപ്പുകളിലെ എല്ലാ ലിങ്കുകളും ഇത് സ്വയമേവ തടയില്ല.', backSafetyReview: 'സുരക്ഷാ പരിശോധനയിലേക്ക് മടങ്ങുക',
    highRiskDetails: 'ഉയർന്ന അപകടസാധ്യതയുള്ള പേയ്മെന്റ് വിവരങ്ങൾ', noMajorWarnings: 'പ്രധാന പ്രാദേശിക മുന്നറിയിപ്പുകളില്ല', reviewCarefully: 'ഈ പേയ്മെന്റ് ശ്രദ്ധിച്ച് പരിശോധിക്കുക', preliminaryChecks: 'ഇവ ഉപകരണത്തിലെ പ്രാഥമിക പരിശോധനകൾ മാത്രമാണ്. പേയ്മെന്റ് ആപ്പ് തുറക്കുന്നതിന് മുമ്പ് പൂർണ്ണ സുരക്ഷാ പരിശോധന നടത്തുക.',
    localRiskScore: 'പ്രാദേശിക അപകട സ്കോർ', highRisk: 'ഉയർന്ന അപകടം', lowIndicators: 'കുറഞ്ഞ സൂചനകൾ', review: 'പരിശോധിക്കുക', paying: 'പണം നൽകുന്നത്', recipientMissing: 'സ്വീകർത്താവിന്റെ പേര് നൽകിയിട്ടില്ല',
    showPaymentDetails: 'പേയ്മെന്റ് വിവരങ്ങൾ കാണിക്കുക', hidePaymentDetails: 'പേയ്മെന്റ് വിവരങ്ങൾ മറയ്ക്കുക',
    cameraPermissionError: 'ക്യാമറ അനുമതി തടഞ്ഞിരിക്കുന്നു. ബ്രൗസർ ക്രമീകരണങ്ങളിൽ ഈ സൈറ്റിന് അനുമതി നൽകുക.', cameraUnavailable: 'ക്യാമറ ലഭ്യമല്ല. പകരം QR ചിത്രം അപ്‌ലോഡ് ചെയ്യുക.', qrUnreadable: 'ഈ ചിത്രത്തിൽ നിന്ന് QR വായിക്കാനായില്ല. വ്യക്തമായ ചിത്രം പരീക്ഷിക്കുക അല്ലെങ്കിൽ UPI ലിങ്ക് ഒട്ടിക്കുക.',
  },
  pa: {
    language: 'ਭਾਸ਼ਾ', paymentSafety: 'ਭੁਗਤਾਨ ਸੁਰੱਖਿਆ', installApp: 'ਐਪ ਇੰਸਟਾਲ ਕਰੋ', installed: 'ਇੰਸਟਾਲ ਹੈ',
    homeEyebrow: 'ਭੁਗਤਾਨ ਸੁਰੱਖਿਆ', homeTitle: 'ਭੁਗਤਾਨ ਤੋਂ ਪਹਿਲਾਂ ਜਾਂਚੋ।', homeDescription: 'ਅੱਗੇ ਵਧਣ ਤੋਂ ਪਹਿਲਾਂ ਭੁਗਤਾਨ ਬੇਨਤੀ ਦੀ ਜਾਂਚ ਲਈ UPI QR ਸਕੈਨ ਕਰੋ।',
    localChecksAi: 'ਸਥਾਨਕ ਜਾਂਚ + ਉਪਲਬਧ ਹੋਣ ਤੇ AI', scanPaymentQr: 'ਭੁਗਤਾਨ QR ਸਕੈਨ ਕਰੋ', scanDescription: 'ਪੈਸੇ ਭੇਜਣ ਤੋਂ ਪਹਿਲਾਂ ਭੁਗਤਾਨ ਵੇਰਵੇ ਜਾਂਚੋ।',
    alignQr: 'QR ਕੋਡ ਨੂੰ ਫਰੇਮ ਵਿੱਚ ਰੱਖੋ', keepCodeVisible: 'ਪੂਰਾ QR ਕੋਡ ਦਿਖਾਈ ਦੇਣਾ ਚਾਹੀਦਾ ਹੈ। ਅੱਗੇ ਵਧਣ ਤੋਂ ਪਹਿਲਾਂ ਭੁਗਤਾਨ ਵੇਰਵੇ ਵੇਖੋ।',
    startCameraScan: 'ਕੈਮਰਾ ਸਕੈਨ ਸ਼ੁਰੂ ਕਰੋ', scanning: 'ਸਕੈਨ ਹੋ ਰਿਹਾ ਹੈ…', stopScanning: 'ਸਕੈਨ ਰੋਕੋ', pasteUpiLink: 'UPI ਲਿੰਕ ਪੇਸਟ ਕਰੋ', uploadQrImage: 'QR ਤਸਵੀਰ ਅੱਪਲੋਡ ਕਰੋ', readingQr: 'ਪੜ੍ਹ ਰਿਹਾ ਹੈ…',
    smsLink: 'SMS/ਲਿੰਕ ਜਾਂਚੋ', moreTools: 'ਹੋਰ ਟੂਲ', toolsEyebrow: 'KAVACH ਤੋਂ ਹੋਰ', toolsTitle: 'ਟੂਲ ਅਤੇ ਜਾਣਕਾਰੀ', toolsDescription: 'ਭੁਗਤਾਨ ਰਿਪੋਰਟ ਵੇਖੋ, ਸਥਾਨਕ ਚੇਤਾਵਨੀ ਨਿਯਮ ਜਾਂਚੋ ਜਾਂ ਪੈਸੇ ਦੇ ਵਹਾਅ ਦੀ ਉਦਾਹਰਨ ਵੇਖੋ।',
    truthTraceReport: 'TruthTrace ਰਿਪੋਰਟ', truthTraceDescription: 'ਬਦਲੇ ਹੋਏ QR ਦੀ ਉਦਾਹਰਨ · ਸਬੂਤਾਂ ਦੀ ਲੜੀ · ਪਹਿਲਾਂ/ਬਾਅਦ ਤੁਲਨਾ', demo: 'ਡੈਮੋ',
    patternMemory: 'ਠੱਗੀ ਪੈਟਰਨ ਮੈਮੋਰੀ', patternMemoryDescription: 'ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਸਥਾਨਕ ਨਿਯਮ ਮਨਜ਼ੂਰ ਕਰਕੇ ਜਾਂਚੋ।', accuracyLab: 'ਸ਼ੁੱਧਤਾ ਲੈਬ', accuracyLabDescription: 'ਨਮੂਨਾ ਮਾਮਲਿਆਂ ਦੀਆਂ ਗਲਤੀਆਂ ਮਾਪੋ ਅਤੇ ਨਿਯਮਾਂ ਦੀ ਤੁਲਨਾ ਕਰੋ।', new: 'ਨਵਾਂ',
    additionalVisualisations: 'ਹੋਰ ਸਿੱਖਿਆਤਮਕ ਦ੍ਰਿਸ਼', fundFlowNetwork: 'ਪੈਸੇ ਦੇ ਵਹਾਅ ਦਾ ਨੈੱਟਵਰਕ', fundFlowDescription: 'ਸਿਰਫ਼ ਉਦਾਹਰਨ — ਬੈਂਕ ਲੈਣ-ਦੇਣ ਦਾ ਡਾਟਾ ਨਹੀਂ।', hackathonDemoMode: 'ਹੈਕਾਥਾਨ ਡੈਮੋ ਮੋਡ', openDemoControls: 'ਡੈਮੋ ਨਿਯੰਤਰਣ ਖੋਲ੍ਹੋ',
    messageCheckerTitle: 'ਸੁਨੇਹਾ ਜਾਂ ਲਿੰਕ ਜਾਂਚੋ', messageCheckerDescription: 'SMS, ਲਿੰਕ ਜਾਂ UPI ਬੇਨਤੀ ਇੱਥੇ ਪੇਸਟ ਕਰੋ। ਚੇਤਾਵਨੀ ਦੇ ਸੰਕੇਤ ਵੇਖੋ; ਪੂਰੀ ਰਿਪੋਰਟ ਲਈ TruthTrace ਖੋਲ੍ਹੋ।',
    messageOrLink: 'ਸੁਨੇਹਾ ਜਾਂ ਲਿੰਕ', messagePlaceholder: 'SMS, WhatsApp ਸੁਨੇਹਾ, ਈਮੇਲ, ਵੈੱਬਸਾਈਟ URL ਜਾਂ UPI ਭੁਗਤਾਨ ਲਿੰਕ ਪੇਸਟ ਕਰੋ…', checkForScams: 'ਠੱਗੀ ਦੀ ਜਾਂਚ ਕਰੋ', optionalDetails: 'ਵਿਕਲਪਿਕ ਵੇਰਵੇ',
    privacyDisclaimer: 'Kavach ਸੁਰੱਖਿਆ ਪ੍ਰੋਟੋਟਾਈਪ ਹੈ, ਗਾਰੰਟੀ ਨਹੀਂ। ਇਹ ਹੋਰ ਐਪਾਂ ਵਿੱਚ ਹਰ ਲਿੰਕ ਨੂੰ ਆਪਣੇ ਆਪ ਨਹੀਂ ਰੋਕ ਸਕਦਾ।', backSafetyReview: 'ਸੁਰੱਖਿਆ ਜਾਂਚ ਵੱਲ ਵਾਪਸ',
    highRiskDetails: 'ਉੱਚ-ਜੋਖਮ ਭੁਗਤਾਨ ਵੇਰਵੇ', noMajorWarnings: 'ਸਥਾਨਕ ਜਾਂਚ ਵਿੱਚ ਵੱਡੀ ਚੇਤਾਵਨੀ ਨਹੀਂ', reviewCarefully: 'ਇਸ ਭੁਗਤਾਨ ਦੀ ਧਿਆਨ ਨਾਲ ਜਾਂਚ ਕਰੋ', preliminaryChecks: 'ਇਹ ਸਿਰਫ਼ ਮੁੱਢਲੀਆਂ ਡਿਵਾਈਸ ਜਾਂਚਾਂ ਹਨ। ਭੁਗਤਾਨ ਐਪ ਖੋਲ੍ਹਣ ਤੋਂ ਪਹਿਲਾਂ ਪੂਰੀ ਸੁਰੱਖਿਆ ਜਾਂਚ ਕਰੋ।',
    localRiskScore: 'ਸਥਾਨਕ ਜੋਖਮ ਸਕੋਰ', highRisk: 'ਉੱਚ ਜੋਖਮ', lowIndicators: 'ਘੱਟ ਸੰਕੇਤ', review: 'ਜਾਂਚੋ', paying: 'ਭੁਗਤਾਨ', recipientMissing: 'ਪ੍ਰਾਪਤਕਰਤਾ ਦਾ ਨਾਮ ਨਹੀਂ ਦਿੱਤਾ',
    showPaymentDetails: 'ਭੁਗਤਾਨ ਵੇਰਵੇ ਦਿਖਾਓ', hidePaymentDetails: 'ਭੁਗਤਾਨ ਵੇਰਵੇ ਲੁਕਾਓ',
    cameraPermissionError: 'ਕੈਮਰਾ ਇਜਾਜ਼ਤ ਬੰਦ ਹੈ। ਬ੍ਰਾਊਜ਼ਰ ਸੈਟਿੰਗਾਂ ਵਿੱਚ ਇਸ ਸਾਈਟ ਲਈ ਇਜਾਜ਼ਤ ਦਿਓ।', cameraUnavailable: 'ਕੈਮਰਾ ਉਪਲਬਧ ਨਹੀਂ। ਇਸ ਦੀ ਥਾਂ QR ਤਸਵੀਰ ਅੱਪਲੋਡ ਕਰੋ।', qrUnreadable: 'ਇਸ ਤਸਵੀਰ ਤੋਂ QR ਨਹੀਂ ਪੜ੍ਹ ਸਕੇ। ਸਾਫ਼ ਤਸਵੀਰ ਵਰਤੋ ਜਾਂ UPI ਲਿੰਕ ਪੇਸਟ ਕਰੋ।',
  },
  or: {
    language: 'ଭାଷା', paymentSafety: 'ପେମେଣ୍ଟ ସୁରକ୍ଷା', installApp: 'ଆପ୍‌ ଇନ୍‌ଷ୍ଟଲ୍‌ କରନ୍ତୁ', installed: 'ଇନ୍‌ଷ୍ଟଲ୍‌ ହୋଇଛି',
    homeEyebrow: 'ପେମେଣ୍ଟ ସୁରକ୍ଷା', homeTitle: 'ଟଙ୍କା ଦେବା ପୂର୍ବରୁ ଯାଞ୍ଚ କରନ୍ତୁ।', homeDescription: 'ଆଗକୁ ବଢ଼ିବା ପୂର୍ବରୁ ପେମେଣ୍ଟ ଅନୁରୋଧ ଯାଞ୍ଚ କରିବାକୁ UPI QR ସ୍କାନ୍‌ କରନ୍ତୁ।',
    localChecksAi: 'ସ୍ଥାନୀୟ ଯାଞ୍ଚ + ଉପଲବ୍ଧ ହେଲେ AI', scanPaymentQr: 'ପେମେଣ୍ଟ QR ସ୍କାନ୍‌ କରନ୍ତୁ', scanDescription: 'ଟଙ୍କା ପଠାଇବା ପୂର୍ବରୁ ପେମେଣ୍ଟ ବିବରଣୀ ଯାଞ୍ଚ କରନ୍ତୁ।',
    alignQr: 'QR କୋଡ୍‌କୁ ଫ୍ରେମ୍‌ ଭିତରେ ରଖନ୍ତୁ', keepCodeVisible: 'ସମ୍ପୂର୍ଣ୍ଣ QR କୋଡ୍‌ ଦେଖାଯିବା ଦରକାର। ଆଗକୁ ବଢ଼ିବା ପୂର୍ବରୁ ପେମେଣ୍ଟ ବିବରଣୀ ଦେଖନ୍ତୁ।',
    startCameraScan: 'କ୍ୟାମେରା ସ୍କାନ୍‌ ଆରମ୍ଭ କରନ୍ତୁ', scanning: 'ସ୍କାନ୍‌ ହେଉଛି…', stopScanning: 'ସ୍କାନ୍‌ ବନ୍ଦ କରନ୍ତୁ', pasteUpiLink: 'UPI ଲିଙ୍କ୍‌ ପେଷ୍ଟ୍‌ କରନ୍ତୁ', uploadQrImage: 'QR ଛବି ଅପ୍‌ଲୋଡ୍‌ କରନ୍ତୁ', readingQr: 'ପଢ଼ୁଛି…',
    smsLink: 'SMS/ଲିଙ୍କ୍‌ ଯାଞ୍ଚ', moreTools: 'ଅଧିକ ଉପକରଣ', toolsEyebrow: 'KAVACH ରୁ ଅଧିକ', toolsTitle: 'ଉପକରଣ ଓ ସୂଚନା', toolsDescription: 'ପେମେଣ୍ଟ ରିପୋର୍ଟ ଦେଖନ୍ତୁ, ସ୍ଥାନୀୟ ସତର୍କତା ନିୟମ ଯାଞ୍ଚ କରନ୍ତୁ କିମ୍ବା ଟଙ୍କା ପ୍ରବାହର ଉଦାହରଣ ଦେଖନ୍ତୁ।',
    truthTraceReport: 'TruthTrace ରିପୋର୍ଟ', truthTraceDescription: 'ବଦଳାଯାଇଥିବା QR ଉଦାହରଣ · ପ୍ରମାଣର କ୍ରମ · ପୂର୍ବ/ପରେ ତୁଳନା', demo: 'ଡେମୋ',
    patternMemory: 'ଠକେଇ ପ୍ୟାଟର୍ନ ମେମୋରି', patternMemoryDescription: 'ବ୍ରାଉଜରରେ ସ୍ଥାନୀୟ ନିୟମକୁ ଅନୁମୋଦନ ଏବଂ ଯାଞ୍ଚ କରନ୍ତୁ।', accuracyLab: 'ସଠିକତା ଲ୍ୟାବ୍‌', accuracyLabDescription: 'ନମୁନା ଘଟଣାର ତ୍ରୁଟି ମାପନ୍ତୁ ଏବଂ ନିୟମ ତୁଳନା କରନ୍ତୁ।', new: 'ନୂଆ',
    additionalVisualisations: 'ଅତିରିକ୍ତ ଶିକ୍ଷାମୂଳକ ଦୃଶ୍ୟ', fundFlowNetwork: 'ଟଙ୍କା ପ୍ରବାହ ନେଟୱର୍କ', fundFlowDescription: 'କେବଳ ଉଦାହରଣ — ବ୍ୟାଙ୍କ କାରବାର ତଥ୍ୟ ନୁହେଁ।', hackathonDemoMode: 'ହ୍ୟାକାଥନ୍‌ ଡେମୋ ମୋଡ୍‌', openDemoControls: 'ଡେମୋ ନିୟନ୍ତ୍ରଣ ଖୋଲନ୍ତୁ',
    messageCheckerTitle: 'ବାର୍ତ୍ତା କିମ୍ବା ଲିଙ୍କ୍‌ ଯାଞ୍ଚ କରନ୍ତୁ', messageCheckerDescription: 'SMS, ଲିଙ୍କ୍‌ କିମ୍ବା UPI ଅନୁରୋଧ ଏଠାରେ ପେଷ୍ଟ୍‌ କରନ୍ତୁ। ସତର୍କତା ସଙ୍କେତ ଦେଖନ୍ତୁ; ପୂର୍ଣ୍ଣ ରିପୋର୍ଟ ପାଇଁ TruthTrace ଖୋଲନ୍ତୁ।',
    messageOrLink: 'ବାର୍ତ୍ତା କିମ୍ବା ଲିଙ୍କ୍‌', messagePlaceholder: 'SMS, WhatsApp ବାର୍ତ୍ତା, ଇମେଲ୍‌, ୱେବସାଇଟ୍‌ URL କିମ୍ବା UPI ପେମେଣ୍ଟ ଲିଙ୍କ୍‌ ପେଷ୍ଟ୍‌ କରନ୍ତୁ…', checkForScams: 'ଠକେଇ ଯାଞ୍ଚ କରନ୍ତୁ', optionalDetails: 'ଇଚ୍ଛାଧୀନ ବିବରଣୀ',
    privacyDisclaimer: 'Kavach ଏକ ସୁରକ୍ଷା ପ୍ରୋଟୋଟାଇପ୍‌, ନିଶ୍ଚିତତା ନୁହେଁ। ଅନ୍ୟ ଆପ୍‌ର ସମସ୍ତ ଲିଙ୍କ୍‌କୁ ଏହା ସ୍ୱୟଂଚାଳିତ ଭାବରେ ଅଟକାଇ ପାରେନାହିଁ।', backSafetyReview: 'ସୁରକ୍ଷା ଯାଞ୍ଚକୁ ଫେରନ୍ତୁ',
    highRiskDetails: 'ଅଧିକ ବିପଦ ପେମେଣ୍ଟ ବିବରଣୀ', noMajorWarnings: 'ସ୍ଥାନୀୟ ଯାଞ୍ଚରେ ବଡ଼ ସତର୍କତା ନାହିଁ', reviewCarefully: 'ପେମେଣ୍ଟକୁ ଧ୍ୟାନରେ ଯାଞ୍ଚ କରନ୍ତୁ', preliminaryChecks: 'ଏଗୁଡ଼ିକ କେବଳ ପ୍ରାରମ୍ଭିକ ଡିଭାଇସ୍‌ ଯାଞ୍ଚ। ପେମେଣ୍ଟ ଆପ୍‌ ଖୋଲିବା ପୂର୍ବରୁ ପୂର୍ଣ୍ଣ ସୁରକ୍ଷା ଯାଞ୍ଚ କରନ୍ତୁ।',
    localRiskScore: 'ସ୍ଥାନୀୟ ବିପଦ ସ୍କୋର୍‌', highRisk: 'ଅଧିକ ବିପଦ', lowIndicators: 'କମ୍‌ ସଙ୍କେତ', review: 'ଯାଞ୍ଚ', paying: 'ପେମେଣ୍ଟ', recipientMissing: 'ଗ୍ରହୀତାଙ୍କ ନାମ ଦିଆଯାଇନାହିଁ',
    showPaymentDetails: 'ପେମେଣ୍ଟ ବିବରଣୀ ଦେଖାନ୍ତୁ', hidePaymentDetails: 'ପେମେଣ୍ଟ ବିବରଣୀ ଲୁଚାନ୍ତୁ',
    cameraPermissionError: 'କ୍ୟାମେରା ଅନୁମତି ବନ୍ଦ ଅଛି। ବ୍ରାଉଜର ସେଟିଂରେ ଏହି ସାଇଟ୍‌କୁ ଅନୁମତି ଦିଅନ୍ତୁ।', cameraUnavailable: 'କ୍ୟାମେରା ମିଳିଲା ନାହିଁ। ବିକଳ୍ପ ଭାବେ QR ଛବି ଅପ୍‌ଲୋଡ୍‌ କରନ୍ତୁ।', qrUnreadable: 'ଏହି ଛବିରୁ QR ପଢ଼ିହେଲା ନାହିଁ। ସ୍ପଷ୍ଟ ଛବି ଚେଷ୍ଟା କରନ୍ତୁ କିମ୍ବା UPI ଲିଙ୍କ୍‌ ପେଷ୍ଟ୍‌ କରନ୍ତୁ।',
  },
  ur: {
    language: 'زبان', paymentSafety: 'ادائیگی کا تحفظ', installApp: 'ایپ انسٹال کریں', installed: 'انسٹال ہے',
    homeEyebrow: 'ادائیگی کا تحفظ', homeTitle: 'ادائیگی سے پہلے جانچیں۔', homeDescription: 'آگے بڑھنے سے پہلے ادائیگی کی درخواست دیکھنے کے لیے UPI QR اسکین کریں۔',
    localChecksAi: 'مقامی جانچ + دستیاب ہو تو AI', scanPaymentQr: 'ادائیگی کا QR اسکین کریں', scanDescription: 'رقم بھیجنے سے پہلے ادائیگی کی تفصیلات جانچیں۔',
    alignQr: 'QR کو فریم کے اندر رکھیں', keepCodeVisible: 'پورا QR کوڈ نظر آنا چاہیے۔ آگے بڑھنے سے پہلے ہم ادائیگی کی تفصیلات دکھائیں گے۔',
    startCameraScan: 'کیمرہ اسکین شروع کریں', scanning: 'اسکین ہو رہا ہے…', stopScanning: 'اسکین روکیں', pasteUpiLink: 'UPI لنک پیسٹ کریں', uploadQrImage: 'QR تصویر اپ لوڈ کریں', readingQr: 'پڑھ رہے ہیں…',
    smsLink: 'SMS/لنک جانچیں', moreTools: 'مزید ٹولز', toolsEyebrow: 'KAVACH کے مزید ٹولز', toolsTitle: 'ٹولز اور معلومات', toolsDescription: 'ادائیگی رپورٹ دیکھیں، مقامی انتباہی قواعد آزمائیں یا رقم کے بہاؤ کی مثال دیکھیں۔',
    truthTraceReport: 'TruthTrace رپورٹ', truthTraceDescription: 'تبدیل شدہ QR کی مثال · شواہد کی کڑی · پہلے اور بعد کا موازنہ', demo: 'ڈیمو',
    patternMemory: 'دھوکہ دہی کے نمونوں کی یادداشت', patternMemoryDescription: 'براؤزر کے مقامی قواعد منظور اور آزمائیں۔', accuracyLab: 'درستگی لیب', accuracyLabDescription: 'نمونہ کیسز کی غلطیاں ناپیں اور قواعد کا موازنہ کریں۔', new: 'نیا',
    additionalVisualisations: 'اضافی تعلیمی خاکے', fundFlowNetwork: 'رقم کے بہاؤ کا نیٹ ورک', fundFlowDescription: 'صرف مثال — بینک لین دین کا ڈیٹا نہیں۔', hackathonDemoMode: 'ہیکاتھون ڈیمو موڈ', openDemoControls: 'ڈیمو کنٹرول کھولیں',
    messageCheckerTitle: 'پیغام یا لنک جانچیں', messageCheckerDescription: 'SMS، لنک یا UPI درخواست یہاں پیسٹ کریں۔ انتباہی اشارے دیکھیں؛ مکمل رپورٹ کے لیے TruthTrace کھولیں۔',
    messageOrLink: 'پیغام یا لنک', messagePlaceholder: 'SMS، WhatsApp پیغام، ای میل، ویب سائٹ URL یا UPI ادائیگی لنک پیسٹ کریں…', checkForScams: 'دھوکہ دہی جانچیں', optionalDetails: 'اختیاری تفصیلات',
    privacyDisclaimer: 'Kavach ایک حفاظتی پروٹوٹائپ ہے، ضمانت نہیں۔ یہ دوسری ایپس کے ہر لنک کو خودکار طور پر نہیں روک سکتا۔', backSafetyReview: 'حفاظتی جانچ پر واپس جائیں',
    highRiskDetails: 'زیادہ خطرے والی ادائیگی کی تفصیلات', noMajorWarnings: 'مقامی جانچ میں بڑی تنبیہ نہیں', reviewCarefully: 'اس ادائیگی کو احتیاط سے جانچیں', preliminaryChecks: 'یہ صرف ابتدائی ڈیوائس جانچ ہے۔ ادائیگی ایپ کھولنے سے پہلے مکمل حفاظتی جانچ کریں۔',
    localRiskScore: 'مقامی خطرے کا اسکور', highRisk: 'زیادہ خطرہ', lowIndicators: 'کم اشارے', review: 'جانچیں', paying: 'ادائیگی', recipientMissing: 'وصول کنندہ کا نام نہیں دیا گیا',
    showPaymentDetails: 'ادائیگی کی تفصیلات دکھائیں', hidePaymentDetails: 'ادائیگی کی تفصیلات چھپائیں',
    cameraPermissionError: 'کیمرے کی اجازت بند ہے۔ براؤزر کی ترتیبات میں اس سائٹ کو کیمرے کی اجازت دیں۔', cameraUnavailable: 'کوئی کیمرہ دستیاب نہیں۔ اس کے بجائے QR تصویر اپ لوڈ کریں۔', qrUnreadable: 'اس تصویر سے QR نہیں پڑھ سکے۔ صاف تصویر آزمائیں یا UPI لنک پیسٹ کریں۔',
  },
};

type I18nContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: MessageKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem('kavach-language') as LanguageCode | null;
    if (saved && LANGUAGES.some((item) => item.code === saved)) return saved;
    const browserLanguage = navigator.language.toLowerCase().split('-')[0];
    if (LANGUAGES.some((item) => item.code === browserLanguage)) return browserLanguage as LanguageCode;
  } catch {
    // Storage can be unavailable in private browsing; English remains the fallback.
  }
  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(getInitialLanguage);

  const setLanguage = (nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
    try {
      window.localStorage.setItem('kavach-language', nextLanguage);
    } catch {
      // The setting still applies for this session if storage is unavailable.
    }
  };

  useEffect(() => {
    const option = LANGUAGES.find((item) => item.code === language);
    document.documentElement.lang = language;
    document.documentElement.dir = option?.dir ?? 'ltr';
  }, [language]);

  const t = (key: MessageKey) => {
    if (language === 'en') return en[key];
    return translations[language][key] ?? en[key];
  };

  const value = useMemo(() => ({ language, setLanguage, t }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
