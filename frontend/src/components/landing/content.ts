export type Language = 'en' | 'hi' | 'mr';

export function parseLanguage(value: string | null): Language {
  return value === 'hi' || value === 'mr' ? value : 'en';
}

export const COPY = {
  en: {
    nav: ['Product', 'How it works', 'Pricing', 'FAQs'], login: 'Log in', start: 'Start free trial', menu: 'Menu', close: 'Close', language: 'Language', skip: 'Skip to content',
    eyebrow: 'FOR INDEPENDENT REAL ESTATE BROKERS', headline: 'Your real estate business, online.',
    intro: 'Branded property pages. WhatsApp sharing. Enquiries in one place. Give every listing a professional home, from apartments to commercial spaces and land.',
    explore: 'Explore sample listings', reassurance: '14-day assisted trial · No card required', categories: ['Residential', 'Commercial', 'Plots & land'],
    portfolioEyebrow: 'YOUR BRAND. EVERY LISTING.', portfolioTitle: 'A better first impression. A clearer next step.',
    portfolioIntro: 'Explore illustrative property pages for three different kinds of business.', sample: 'Sample portfolio', agency: 'Prime Realty', agencyLocation: 'Pune, Maharashtra',
    sampleNote: 'Illustrative listings and photography. These properties are not offered for sale or rent.', all: 'All properties', filter: 'Property type', view: 'View property', details: 'Property details',
    titles: ['Garden residence in Baner', 'Workspace in Kharadi', 'Land parcel near Mulshi'], locations: ['Baner, Pune', 'Kharadi, Pune', 'Mulshi, Pune'],
    prices: ['₹1.65 Cr', '₹85,000 / month', '₹72 lakh'], statuses: ['For sale', 'For lease', 'For sale'],
    specs: [['3 bedrooms', '1,460 sq ft', 'Ready to move'], ['1,200 sq ft', 'Office space', 'Unfurnished'], ['4,000 sq ft', 'Land parcel', 'Road access']],
    descriptions: ['An illustrative residence with bright living spaces and a garden. A property page brings photos, area, price and contact details together.', 'An illustrative office listing with floor area, furnishing and lease price. Commercial details take priority over residential fields.', 'An illustrative land listing with area and access details. Land use, title and permissions must be independently verified before a transaction.'],
    createLike: 'Create your own listing', copy: 'Copy sample link', copied: 'Link copied', copyError: 'Could not copy. Copy the address from your browser.',
    howEyebrow: 'FROM LISTING TO CONVERSATION', howTitle: 'One straightforward workflow.',
    steps: [['Add your property', 'Upload photos and the relevant details: price, location, area and property type.'], ['Review and share', 'Refine your description, publish a branded page and send the link through WhatsApp.'], ['Follow up with context', 'Review captured enquiries and buyer actions, then organise your next conversation.']],
    featuresEyebrow: 'BUILT AROUND YOUR WORKDAY', featuresTitle: 'More useful after you hit share.',
    features: [['Your identity, front and centre', 'Put your agency name, logo and contact details on the pages you share.'], ['WhatsApp, with context', 'Share a property link and bring buyers back to its photos, details and enquiry action.'], ['AI-assisted descriptions', 'Create a draft from the property details you supply. Review the facts before publishing.'], ['Enquiries you can act on', 'Keep captured leads, notes and stages together. Page views are signals, not confirmed buyers.']],
    priceEyebrow: 'FOUNDING BROKER PROGRAM', priceTitle: 'Start with one real property.', priceIntro: 'Try the workflow with your own branding. Get help with your first three listings.',
    trialTitle: 'Assisted trial', trialPrice: 'Free', trialPeriod: 'for 14 days', trialFeatures: ['Up to 10 listings', 'Up to 2 workspace users', 'Up to 50 leads', 'Branded pages and sharing'],
    paidTitle: 'Founding Pro', paidPrice: '₹499', paidPeriod: 'per month · assisted activation', paidFeatures: ['Up to 100 listings', 'Up to 5 workspace users', 'Up to 500 leads', 'Listing and enquiry analytics'],
    priceNote: 'Pro activation is arranged with support. Confirm applicable taxes and any additional service charges before upgrading.', talk: 'Discuss Pro access',
    faqTitle: 'Before you start.', faqs: [
      ['Is this only for residential brokers?', 'No. The product supports residential, commercial and land listings. Use the fields and descriptions relevant to each property.'],
      ['What happens after the 14-day trial?', 'The assisted trial lasts 14 days. Contact support to arrange paid access and confirm your account terms. This signup does not collect a card or start an automatic payment.'],
      ['Are WhatsApp automation and AI unlimited?', 'No unlimited allowance is promised. Sharing a link is separate from automated WhatsApp messaging. Automation requires provider setup; messaging charges and AI availability or limits should be confirmed with support.'],
      ['Do I get my own domain or broker website?', 'Branded individual property pages are available. The portfolio shown here is a sample experience. Broker subdomains and custom-domain websites are planned and are not included in the current offer.'],
      ['Can I see exactly who viewed a listing?', 'A page view does not identify a buyer. Use captured enquiries and contact actions for follow-up; anonymous views are only activity signals.'],
      ['What about 3D visits, community and legal services?', 'These are future directions, not included services. The current focus is publishing listings, sharing and managing enquiries.'],
    ],
    finalTitle: 'Make your next listing your first step.', finalText: 'Bring your photos and property details. We will help you get started.', footer: 'Made for real estate professionals.', footerLinks: ['Support', 'Privacy', 'Terms', 'Refunds'],
  },
  hi: {
    nav: ['प्रोडक्ट', 'कैसे काम करता है', 'कीमत', 'सवाल'], login: 'लॉग इन', start: 'मुफ़्त ट्रायल शुरू करें', menu: 'मेन्यू', close: 'बंद करें', language: 'भाषा', skip: 'मुख्य सामग्री पर जाएं',
    eyebrow: 'स्वतंत्र रियल एस्टेट ब्रोकर्स के लिए', headline: 'आपका रियल एस्टेट व्यवसाय, अब ऑनलाइन।',
    intro: 'आपके ब्रांड के प्रॉपर्टी पेज, WhatsApp शेयरिंग और सभी पूछताछ एक जगह। घर, कमर्शियल स्पेस और ज़मीन, हर लिस्टिंग को दें एक पेशेवर पहचान।',
    explore: 'सैंपल लिस्टिंग देखें', reassurance: '14 दिन का सहायता सहित ट्रायल · कार्ड की ज़रूरत नहीं', categories: ['आवासीय', 'कमर्शियल', 'प्लॉट और ज़मीन'],
    portfolioEyebrow: 'हर लिस्टिंग पर आपका ब्रांड', portfolioTitle: 'बेहतर पहली छाप। अगला कदम साफ़।', portfolioIntro: 'तीन तरह की प्रॉपर्टी के उदाहरण देखें।', sample: 'सैंपल पोर्टफोलियो', agency: 'प्राइम रियल्टी', agencyLocation: 'पुणे, महाराष्ट्र',
    sampleNote: 'लिस्टिंग और तस्वीरें केवल उदाहरण हैं। ये प्रॉपर्टी बिक्री या किराए के लिए उपलब्ध नहीं हैं।', all: 'सभी प्रॉपर्टी', filter: 'प्रॉपर्टी का प्रकार', view: 'प्रॉपर्टी देखें', details: 'प्रॉपर्टी की जानकारी',
    titles: ['बाणेर में गार्डन वाला घर', 'खराड़ी में ऑफिस', 'मुलशी के पास ज़मीन'], locations: ['बाणेर, पुणे', 'खराड़ी, पुणे', 'मुलशी, पुणे'], prices: ['₹1.65 करोड़', '₹85,000 / महीना', '₹72 लाख'], statuses: ['बिक्री के लिए', 'लीज़ के लिए', 'बिक्री के लिए'],
    specs: [['3 बेडरूम', '1,460 वर्ग फुट', 'रहने के लिए तैयार'], ['1,200 वर्ग फुट', 'ऑफिस स्पेस', 'बिना फर्नीचर'], ['4,000 वर्ग फुट', 'ज़मीन', 'सड़क से पहुंच']],
    descriptions: ['बगीचे और रोशनी वाले कमरों के साथ एक घर का उदाहरण। तस्वीरें, क्षेत्रफल, कीमत और संपर्क की जानकारी एक पेज पर।', 'क्षेत्रफल, फर्निशिंग और लीज़ की कीमत के साथ ऑफिस का उदाहरण। इसमें कमर्शियल प्रॉपर्टी की जानकारी को प्राथमिकता दी गई है।', 'क्षेत्रफल और रास्ते की जानकारी के साथ ज़मीन का उदाहरण। सौदे से पहले उपयोग, मालिकाना हक़ और अनुमतियों की स्वतंत्र जांच ज़रूरी है।'],
    createLike: 'अपनी लिस्टिंग बनाएं', copy: 'सैंपल लिंक कॉपी करें', copied: 'लिंक कॉपी हुआ', copyError: 'लिंक कॉपी नहीं हुआ। ब्राउज़र से पता कॉपी करें।',
    howEyebrow: 'लिस्टिंग से बातचीत तक', howTitle: 'एक आसान प्रक्रिया।', steps: [['प्रॉपर्टी जोड़ें', 'तस्वीरें, कीमत, स्थान, क्षेत्रफल और प्रॉपर्टी का प्रकार दर्ज करें।'], ['जांचें और शेयर करें', 'विवरण सुधारें, अपने ब्रांड का पेज पब्लिश करें और WhatsApp पर लिंक भेजें।'], ['जानकारी के साथ फॉलो-अप करें', 'पूछताछ और खरीदारों की गतिविधि देखें, फिर अगली बातचीत की तैयारी करें।']],
    featuresEyebrow: 'आपके रोज़ के काम के लिए', featuresTitle: 'शेयर करने के बाद भी उपयोगी।', features: [['आपकी पहचान सबसे आगे', 'हर पेज पर अपनी एजेंसी का नाम, लोगो और संपर्क जानकारी दिखाएं।'], ['जानकारी के साथ WhatsApp', 'एक लिंक से खरीदार को तस्वीरें, विवरण और पूछताछ का विकल्प दें।'], ['AI की मदद से विवरण', 'आपकी दी हुई जानकारी से ड्राफ्ट बनाएं। पब्लिश करने से पहले तथ्यों की जांच करें।'], ['पूछताछ पर अगला कदम', 'लीड, नोट्स और स्टेज एक जगह रखें। पेज व्यू रुचि का संकेत है, पक्का खरीदार नहीं।']],
    priceEyebrow: 'फाउंडिंग ब्रोकर प्रोग्राम', priceTitle: 'एक असली प्रॉपर्टी से शुरुआत करें।', priceIntro: 'अपने ब्रांड के साथ काम करके देखें। पहली तीन लिस्टिंग में सहायता पाएं।',
    trialTitle: 'सहायता सहित ट्रायल', trialPrice: 'मुफ़्त', trialPeriod: '14 दिनों के लिए', trialFeatures: ['10 लिस्टिंग तक', '2 यूज़र तक', '50 लीड तक', 'ब्रांडेड पेज और शेयरिंग'],
    paidTitle: 'फाउंडिंग प्रो', paidPrice: '₹499', paidPeriod: 'प्रति महीना · सहायता से एक्टिवेशन', paidFeatures: ['100 लिस्टिंग तक', '5 यूज़र तक', '500 लीड तक', 'लिस्टिंग और पूछताछ के आंकड़े'], priceNote: 'प्रो एक्टिवेशन के लिए सपोर्ट से बात करें। अपग्रेड से पहले लागू टैक्स और अतिरिक्त सेवा शुल्क की पुष्टि करें।', talk: 'प्रो के बारे में बात करें',
    faqTitle: 'शुरुआत से पहले।', faqs: [
      ['क्या यह सिर्फ़ आवासीय ब्रोकर्स के लिए है?', 'नहीं। आवासीय, कमर्शियल और ज़मीन की लिस्टिंग समर्थित हैं। हर प्रॉपर्टी के अनुसार जानकारी भरें।'],
      ['14 दिनों के बाद क्या होगा?', 'सहायता सहित ट्रायल 14 दिन का है। पेड एक्सेस और शर्तों के लिए सपोर्ट से बात करें। साइनअप में कार्ड नहीं लिया जाता और अपने आप भुगतान शुरू नहीं होता।'],
      ['क्या WhatsApp ऑटोमेशन और AI अनलिमिटेड हैं?', 'अनलिमिटेड उपयोग का वादा नहीं है। लिंक शेयरिंग और ऑटोमेटेड संदेश अलग हैं। ऑटोमेशन के लिए प्रदाता सेटअप चाहिए। मैसेजिंग शुल्क और AI की उपलब्धता या सीमा सपोर्ट से पूछें।'],
      ['क्या मेरा अपना डोमेन या वेबसाइट मिलेगी?', 'ब्रांडेड प्रॉपर्टी पेज उपलब्ध हैं। यहां दिखाया गया पोर्टफोलियो एक सैंपल है। ब्रोकर सबडोमेन और कस्टम डोमेन वेबसाइट भविष्य की योजना हैं, अभी के ऑफर में शामिल नहीं हैं।'],
      ['क्या हर पेज देखने वाले की पहचान मिलती है?', 'नहीं। पेज व्यू से खरीदार की पहचान नहीं होती। फॉलो-अप के लिए मिली पूछताछ और संपर्क गतिविधि का उपयोग करें।'],
      ['3D विज़िट, कम्युनिटी और कानूनी सेवाएं कब?', 'ये भविष्य की दिशाएं हैं, अभी शामिल सेवाएं नहीं। फिलहाल लिस्टिंग, शेयरिंग और पूछताछ प्रबंधन पर ध्यान है।'],
    ], finalTitle: 'अगली लिस्टिंग से शुरुआत करें।', finalText: 'अपनी तस्वीरें और प्रॉपर्टी की जानकारी लाएं। शुरुआत में हम मदद करेंगे।', footer: 'रियल एस्टेट पेशेवरों के लिए बनाया गया।', footerLinks: ['सपोर्ट', 'गोपनीयता', 'शर्तें', 'रिफंड'],
  },
  mr: {
    nav: ['प्रोडक्ट', 'कसे काम करते', 'किंमत', 'प्रश्न'], login: 'लॉग इन', start: 'मोफत ट्रायल सुरू करा', menu: 'मेन्यू', close: 'बंद करा', language: 'भाषा', skip: 'मुख्य मजकुरावर जा',
    eyebrow: 'स्वतंत्र रिअल इस्टेट ब्रोकर्ससाठी', headline: 'तुमचा रिअल इस्टेट व्यवसाय, आता ऑनलाइन.',
    intro: 'तुमच्या ब्रँडचे प्रॉपर्टी पेज, WhatsApp शेअरिंग आणि सर्व चौकशी एकाच ठिकाणी. घरे, व्यावसायिक जागा आणि जमीन, प्रत्येक लिस्टिंगला व्यावसायिक ओळख द्या.',
    explore: 'नमुना लिस्टिंग पहा', reassurance: '14 दिवसांची मदतीसह ट्रायल · कार्डची गरज नाही', categories: ['निवासी', 'व्यावसायिक', 'प्लॉट व जमीन'],
    portfolioEyebrow: 'प्रत्येक लिस्टिंगवर तुमचा ब्रँड', portfolioTitle: 'उत्तम पहिली छाप. पुढचे पाऊल स्पष्ट.', portfolioIntro: 'तीन प्रकारच्या प्रॉपर्टी पेजची उदाहरणे पहा.', sample: 'नमुना पोर्टफोलिओ', agency: 'प्राइम रिअल्टी', agencyLocation: 'पुणे, महाराष्ट्र',
    sampleNote: 'लिस्टिंग आणि छायाचित्रे केवळ उदाहरणे आहेत. या प्रॉपर्टी विक्री किंवा भाड्याने उपलब्ध नाहीत.', all: 'सर्व प्रॉपर्टी', filter: 'प्रॉपर्टीचा प्रकार', view: 'प्रॉपर्टी पहा', details: 'प्रॉपर्टीची माहिती',
    titles: ['बाणेरमधील बाग असलेले घर', 'खराडीमधील कार्यालय', 'मुळशीजवळील जमीन'], locations: ['बाणेर, पुणे', 'खराडी, पुणे', 'मुळशी, पुणे'], prices: ['₹1.65 कोटी', '₹85,000 / महिना', '₹72 लाख'], statuses: ['विक्रीसाठी', 'लीजसाठी', 'विक्रीसाठी'],
    specs: [['3 बेडरूम', '1,460 चौ. फूट', 'राहण्यासाठी तयार'], ['1,200 चौ. फूट', 'कार्यालयीन जागा', 'फर्निचरशिवाय'], ['4,000 चौ. फूट', 'जमीन', 'रस्त्याची सोय']],
    descriptions: ['बाग आणि प्रकाशमान खोल्या असलेल्या घराचे उदाहरण. फोटो, क्षेत्रफळ, किंमत आणि संपर्क एकाच पेजवर.', 'क्षेत्रफळ, फर्निचर आणि लीजच्या किमतीसह कार्यालयाचे उदाहरण. व्यावसायिक प्रॉपर्टीची संबंधित माहिती येथे महत्त्वाची आहे.', 'क्षेत्रफळ आणि रस्त्याच्या माहितीसह जमिनीचे उदाहरण. व्यवहारापूर्वी वापर, मालकी हक्क आणि परवानग्यांची स्वतंत्र पडताळणी आवश्यक आहे.'],
    createLike: 'स्वतःची लिस्टिंग तयार करा', copy: 'नमुना लिंक कॉपी करा', copied: 'लिंक कॉपी झाली', copyError: 'लिंक कॉपी झाली नाही. ब्राउझरमधील पत्ता कॉपी करा.',
    howEyebrow: 'लिस्टिंगपासून संवादापर्यंत', howTitle: 'एक सोपी प्रक्रिया.', steps: [['प्रॉपर्टी जोडा', 'फोटो, किंमत, ठिकाण, क्षेत्रफळ आणि प्रॉपर्टीचा प्रकार भरा.'], ['तपासा आणि शेअर करा', 'वर्णन सुधारा, ब्रँडेड पेज प्रकाशित करा आणि WhatsApp वर लिंक पाठवा.'], ['माहितीसह फॉलो-अप करा', 'आलेल्या चौकशा आणि खरेदीदारांची कृती पहा, मग पुढील संवादाची तयारी करा.']],
    featuresEyebrow: 'तुमच्या रोजच्या कामासाठी', featuresTitle: 'शेअर केल्यानंतरही उपयोगी.', features: [['तुमची ओळख सर्वात पुढे', 'प्रत्येक पेजवर एजन्सीचे नाव, लोगो आणि संपर्क माहिती दाखवा.'], ['माहितीसह WhatsApp', 'एका लिंकवरून खरेदीदाराला फोटो, माहिती आणि चौकशीचा पर्याय द्या.'], ['AI च्या मदतीने वर्णन', 'तुम्ही दिलेल्या माहितीवरून मसुदा तयार करा. प्रकाशित करण्यापूर्वी तथ्ये तपासा.'], ['चौकशीनंतर पुढचे पाऊल', 'लीड, नोंदी आणि टप्पे एकत्र ठेवा. पेज व्ह्यू हा रुचीचा संकेत आहे, निश्चित खरेदीदार नाही.']],
    priceEyebrow: 'फाउंडिंग ब्रोकर प्रोग्राम', priceTitle: 'एका खऱ्या प्रॉपर्टीपासून सुरुवात करा.', priceIntro: 'स्वतःच्या ब्रँडसह काम करून पहा. पहिल्या तीन लिस्टिंगसाठी मदत मिळवा.',
    trialTitle: 'मदतीसह ट्रायल', trialPrice: 'मोफत', trialPeriod: '14 दिवसांसाठी', trialFeatures: ['10 लिस्टिंगपर्यंत', '2 वापरकर्त्यांपर्यंत', '50 लीडपर्यंत', 'ब्रँडेड पेज आणि शेअरिंग'],
    paidTitle: 'फाउंडिंग प्रो', paidPrice: '₹499', paidPeriod: 'दरमहा · मदतीसह सक्रियकरण', paidFeatures: ['100 लिस्टिंगपर्यंत', '5 वापरकर्त्यांपर्यंत', '500 लीडपर्यंत', 'लिस्टिंग आणि चौकशीचे विश्लेषण'], priceNote: 'प्रो सक्रिय करण्यासाठी सपोर्टशी बोला. अपग्रेड करण्यापूर्वी लागू कर आणि अतिरिक्त सेवा शुल्क निश्चित करा.', talk: 'प्रोबद्दल चर्चा करा',
    faqTitle: 'सुरुवात करण्यापूर्वी.', faqs: [
      ['हे फक्त निवासी ब्रोकर्ससाठी आहे का?', 'नाही. निवासी, व्यावसायिक आणि जमिनीच्या लिस्टिंग करता येतात. प्रत्येक प्रकारानुसार संबंधित माहिती भरा.'],
      ['14 दिवसांनंतर काय होते?', 'मदतीसह ट्रायल 14 दिवसांची आहे. सशुल्क प्रवेश आणि अटींसाठी सपोर्टशी बोला. साइनअपमध्ये कार्ड घेतले जात नाही आणि आपोआप पैसे आकारले जात नाहीत.'],
      ['WhatsApp ऑटोमेशन आणि AI अमर्यादित आहे का?', 'अमर्यादित वापराचे आश्वासन नाही. लिंक शेअरिंग आणि स्वयंचलित संदेश वेगळे आहेत. ऑटोमेशनसाठी प्रदात्याचे सेटअप आवश्यक आहे. संदेशांचे शुल्क आणि AI उपलब्धता किंवा मर्यादा सपोर्टकडून जाणून घ्या.'],
      ['माझा स्वतःचा डोमेन किंवा वेबसाइट मिळेल का?', 'ब्रँडेड प्रॉपर्टी पेज उपलब्ध आहेत. येथे दाखवलेला पोर्टफोलिओ नमुना आहे. ब्रोकर सबडोमेन आणि कस्टम डोमेन वेबसाइट पुढील योजना आहेत; सध्याच्या ऑफरमध्ये नाहीत.'],
      ['पेज पाहणाऱ्या प्रत्येकाची ओळख समजते का?', 'नाही. पेज व्ह्यूवरून खरेदीदाराची ओळख कळत नाही. फॉलो-अपसाठी आलेल्या चौकशा आणि संपर्क कृती वापरा.'],
      ['3D भेटी, कम्युनिटी आणि कायदेशीर सेवा कधी?', 'या भविष्यातील दिशा आहेत, सध्या समाविष्ट सेवा नाहीत. आत्ताचा भर लिस्टिंग, शेअरिंग आणि चौकशी व्यवस्थापनावर आहे.'],
    ], finalTitle: 'पुढच्या लिस्टिंगपासून सुरुवात करा.', finalText: 'तुमचे फोटो आणि प्रॉपर्टीची माहिती आणा. सुरुवात करण्यासाठी आम्ही मदत करू.', footer: 'रिअल इस्टेट व्यावसायिकांसाठी बनवलेले.', footerLinks: ['सपोर्ट', 'गोपनीयता', 'अटी', 'परतावा'],
  },
};

export const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=85',
];

export function signupHref(language: Language, source: string) {
  return `/auth/signup?${new URLSearchParams({ lang: language, source })}`;
}
