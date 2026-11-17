const en={writingTitle:'Optional Writing AI',adult:'I confirm I am 18 or older.',writing:'I agree to Google Gemini analysis of my submitted diagnostic essay.',
  deepseekWriting:'I agree to DeepSeek analysis of my submitted diagnostic essay.',
  deepseekProvider:'DeepSeek will receive your essay for analysis under its provider terms. Do not include personal or confidential information. Our deletion policy does not erase provider copies or backups. You can choose human-only feedback instead.',
  help:'Optional suggestions remain private until reviewed by an examiner. Declining does not prevent human feedback.',
  unavailable:'AI analysis is currently unavailable. Your diagnostic can be assessed by an examiner.',save:'Save Writing preferences',saved:'Writing preferences saved.',
  provider:'Free Gemini can use submissions to improve Google services and for human review. Do not include personal or confidential information. Our deletion policy does not erase Google’s copies or backups.',
  withdrawn:'Consent has been withdrawn for this diagnostic. Recording and analysis cannot be restarted for this session.'};
type Messages={[K in keyof typeof en]:string};
const fr:Messages={writingTitle:'IA facultative pour l’écrit',adult:'Je confirme avoir 18 ans ou plus.',writing:'J’accepte l’analyse de ma rédaction diagnostique par Google Gemini.',
  deepseekWriting:'J’accepte l’analyse de ma rédaction diagnostique par DeepSeek.',
  deepseekProvider:'DeepSeek recevra votre rédaction pour analyse selon ses conditions. N’incluez pas d’informations personnelles ou confidentielles. Notre suppression n’efface pas les copies ni les sauvegardes du prestataire. Vous pouvez choisir une évaluation humaine uniquement.',
  help:'Les suggestions restent privées jusqu’à leur validation par un examinateur. Le refus n’empêche pas les commentaires humains.',
  unavailable:'L’analyse par IA est actuellement indisponible. Un examinateur peut évaluer votre diagnostic.',save:'Enregistrer les préférences pour l’écrit',saved:'Préférences pour l’écrit enregistrées.',
  provider:'Gemini gratuit peut utiliser les contenus pour améliorer les services Google et permettre une vérification humaine. N’incluez pas d’informations personnelles ou confidentielles. Notre suppression n’efface pas les copies de Google ni les sauvegardes.',
  withdrawn:'Le consentement a été retiré pour ce diagnostic. L’enregistrement et l’analyse ne peuvent pas être relancés pour cette session.'};
const ar:Messages={writingTitle:'تحليل كتابي اختياري بالذكاء الاصطناعي',adult:'أؤكد أن عمري 18 سنة أو أكثر.',writing:'أوافق على تحليل مقال الاختبار التشخيصي بواسطة Google Gemini.',
  deepseekWriting:'أوافق على تحليل مقال الاختبار التشخيصي بواسطة DeepSeek.',
  deepseekProvider:'ستتلقى DeepSeek مقالك للتحليل وفق شروطها. لا تُضمّن معلومات شخصية أو سرية. الحذف لدينا لا يمحو نسخ مزوّد الخدمة أو نسخه الاحتياطية. يمكنك اختيار التقييم البشري فقط.',
  help:'تبقى المقترحات خاصة حتى يراجعها الممتحن. رفض التحليل لا يمنع التقييم البشري.',
  unavailable:'التحليل بالذكاء الاصطناعي غير متاح حالياً. يمكن للممتحن تقييم اختبارك التشخيصي.',save:'حفظ تفضيلات التحليل الكتابي',saved:'تم حفظ تفضيلات التحليل الكتابي.',
  provider:'قد تستخدم خدمة Gemini المجانية المحتوى لتحسين خدمات Google وللمراجعة البشرية. لا تُضمّن معلومات شخصية أو سرية. الحذف لدينا لا يمحو نسخ Google أو النسخ الاحتياطية.',
  withdrawn:'سُحبت الموافقة لهذا الاختبار التشخيصي. لا يمكن إعادة بدء التسجيل أو التحليل لهذه الجلسة.'};
export const diagnosticPrivacyMessages={en,fr,ar};
