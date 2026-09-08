'use client';

import { useState, useId } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { COPY, Language } from './content';

// Deterministic output map — same inputs always produce the same output.
// No API calls are made. This is a static example.
const OUTPUTS: Record<string, Record<string, string>> = {
  en: {
    'Residential|3 BHK|1,460 sq ft|Baner, Pune|₹1.65 Cr': 'A well-maintained 3 BHK apartment in the sought-after Baner neighbourhood of Pune. The 1,460 sq ft layout includes three bedrooms, a living area and a kitchen. Priced at ₹1.65 Cr. Located in Baner with easy access to key corridors. Suitable for families and working professionals. Contact for a site visit.',
    'Residential|2 BHK|1,460 sq ft|Baner, Pune|₹1.65 Cr': 'A 2 BHK apartment in Baner, Pune spanning 1,460 sq ft. The unit includes two bedrooms, a living area and a kitchen. Priced at ₹1.65 Cr. Baner offers proximity to IT hubs and retail areas. Contact for details or a site visit.',
    [`Commercial|N/A|1,460 sq ft|Baner, Pune|\u20b91.65 Cr`]: `A commercial space of 1,460 sq ft available in Baner, Pune. Priced at \u20b91.65 Cr. The space is suitable for office or business use. Baner has strong connectivity to Pune's western corridors. Contact for a viewing.`,
    'Land|N/A|1,460 sq ft|Baner, Pune|₹1.65 Cr': 'A land parcel of 1,460 sq ft in Baner, Pune. Priced at ₹1.65 Cr. Land use, title and permissions must be independently verified before any transaction. Contact for further details.',
  },
  hi: {
    'आवासीय|3 BHK|1,460 वर्ग फुट|बाणेर, पुणे|₹1.65 करोड़': 'पुणे के बाणेर इलाके में एक अच्छी तरह से बनाए गए 3 BHK अपार्टमेंट में तीन बेडरूम, एक लिविंग एरिया और एक किचन है। क्षेत्रफल 1,460 वर्ग फुट है। कीमत ₹1.65 करोड़। बाणेर में मुख्य मार्गों से अच्छी कनेक्टिविटी है। परिवारों और कामकाजी पेशेवरों के लिए उपयुक्त। साइट विज़िट के लिए संपर्क करें।',
    'आवासीय|2 BHK|1,460 वर्ग फुट|बाणेर, पुणे|₹1.65 करोड़': 'बाणेर, पुणे में 1,460 वर्ग फुट का 2 BHK अपार्टमेंट। इसमें दो बेडरूम, एक लिविंग एरिया और एक किचन शामिल है। कीमत ₹1.65 करोड़। बाणेर IT हब और रिटेल क्षेत्रों के नज़दीक है। संपर्क के लिए कृपया संदेश भेजें।',
  },
  mr: {
    'निवासी|3 BHK|1,460 चौ. फूट|बाणेर, पुणे|₹1.65 कोटी': 'पुण्यातील बाणेर परिसरात उत्तम प्रकारे सांभाळलेल्या 3 BHK अपार्टमेंटमध्ये तीन बेडरूम, एक बैठकीची खोली आणि स्वयंपाकघर आहे। क्षेत्रफळ 1,460 चौ. फूट आहे. किंमत ₹1.65 कोटी. बाणेरमध्ये मुख्य मार्गांशी चांगली जोडणी आहे. कुटुंब आणि नोकरदारांसाठी योग्य. प्रत्यक्ष भेटीसाठी संपर्क करा.',
    'निवासी|2 BHK|1,460 चौ. फूट|बाणेर, पुणे|₹1.65 कोटी': 'बाणेर, पुण्यात 1,460 चौ. फूटचे 2 BHK अपार्टमेंट. दोन बेडरूम, बैठकीची खोली आणि स्वयंपाकघर. किंमत ₹1.65 कोटी. बाणेर IT आणि व्यापार केंद्रांजवळ आहे. अधिक माहितीसाठी संपर्क करा.',
  },
};

function getOutput(lang: Language, type: string, bedrooms: string, area: string, location: string, price: string, defaultOutput: string): string {
  const key = `${type}|${bedrooms}|${area}|${location}|${price}`;
  return OUTPUTS[lang]?.[key] ?? defaultOutput;
}

export function AIDescriptionDemo({ currentLang }: { currentLang: Language }) {
  const t = COPY[currentLang];
  const d = t.aiDemoDefaults;
  const uid = useId();

  const [inputs, setInputs] = useState({
    type: d.type,
    bedrooms: d.bedrooms,
    area: d.area,
    location: d.location,
    price: d.price,
  });

  const [generated, setGenerated] = useState(true);
  const [draft, setDraft] = useState(t.aiDemoOutput);

  const generate = () => {
    const output = getOutput(currentLang, inputs.type, inputs.bedrooms, inputs.area, inputs.location, inputs.price, t.aiDemoOutput);
    setDraft(output);
    setGenerated(true);
  };

  const update = (field: keyof typeof inputs, value: string) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
    setGenerated(false);
  };

  return (
    <section id="ai-demo" className="landing-band ai-demo-section" aria-labelledby="ai-demo-title">
      <div className="landing-wrap">
        <p className="landing-eyebrow">{t.aiDemoEyebrow}</p>
        <h2 id="ai-demo-title">{t.aiDemoTitle}</h2>
        <p className="ai-demo-note">{t.aiDemoNote}</p>

        <div className="ai-demo-layout">
          {/* Input panel */}
          <div className="ai-demo-inputs" aria-label="Property details">
            <div className="ai-demo-field-group">
              <label htmlFor={`${uid}-type`} className="ai-demo-label">{t.aiDemoInputs.type}</label>
              <select
                id={`${uid}-type`}
                className="ai-demo-select"
                value={inputs.type}
                onChange={(e) => update('type', e.target.value)}
              >
                {t.aiDemoOptions.type.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="ai-demo-field-group">
              <label htmlFor={`${uid}-beds`} className="ai-demo-label">{t.aiDemoInputs.bedrooms}</label>
              <select
                id={`${uid}-beds`}
                className="ai-demo-select"
                value={inputs.bedrooms}
                onChange={(e) => update('bedrooms', e.target.value)}
              >
                {t.aiDemoOptions.bedrooms.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="ai-demo-field-group">
              <label htmlFor={`${uid}-area`} className="ai-demo-label">{t.aiDemoInputs.area}</label>
              <input
                id={`${uid}-area`}
                type="text"
                className="ai-demo-input"
                value={inputs.area}
                onChange={(e) => update('area', e.target.value)}
                placeholder={d.area}
              />
            </div>

            <div className="ai-demo-field-group">
              <label htmlFor={`${uid}-location`} className="ai-demo-label">{t.aiDemoInputs.location}</label>
              <input
                id={`${uid}-location`}
                type="text"
                className="ai-demo-input"
                value={inputs.location}
                onChange={(e) => update('location', e.target.value)}
                placeholder={d.location}
              />
            </div>

            <div className="ai-demo-field-group">
              <label htmlFor={`${uid}-price`} className="ai-demo-label">{t.aiDemoInputs.price}</label>
              <input
                id={`${uid}-price`}
                type="text"
                className="ai-demo-input"
                value={inputs.price}
                onChange={(e) => update('price', e.target.value)}
                placeholder={d.price}
              />
            </div>

            <button
              type="button"
              className="ai-demo-generate-btn"
              onClick={generate}
              aria-label="Generate example description"
            >
              <Sparkles size={16} aria-hidden="true" />
              {generated ? 'Regenerate example' : 'Generate example'}
            </button>
          </div>

          {/* Output panel */}
          <div className="ai-demo-output-panel">
            <div className="ai-demo-output-header">
              <span className="ai-demo-output-label">{t.aiDemoOutputLabel}</span>
              <span className="ai-demo-example-badge">{t.aiDemoLabel}</span>
            </div>
            <textarea
              className="ai-demo-textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              aria-label={t.aiDemoOutputLabel}
              aria-describedby={`${uid}-disclaimer`}
            />
            <div className="ai-demo-disclaimer" id={`${uid}-disclaimer`} role="note">
              <AlertCircle size={14} aria-hidden="true" />
              <p>{t.aiDemoDisclaimer}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
