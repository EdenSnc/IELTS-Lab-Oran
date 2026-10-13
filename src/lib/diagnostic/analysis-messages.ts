import type {DiagnosticLocale} from './messages';
export const diagnosticAnalysisMessages:Record<DiagnosticLocale,{
 title:string;help:string;queue:string;refresh:string;apply:string;humanOnly:string;humanOnlyHelp:string;confirm:string;review:string;candidate:string;examiner:string;uncertain:string;
 speaker:string;queued:string;unavailable:string;error:string;invalid:string;replay:string;fluency:string;lexical:string;grammar:string;pronunciation:string;
}>={
 en:{title:'Optional Speaking feedback',help:'AI suggestions are a draft, not a score. Check the recording, transcript and every speaker assignment before applying them. Times and quotations are model estimates, not verified source truth.',
 queue:'Request Speaking feedback',refresh:'Refresh Speaking feedback',apply:'Apply Speaking suggestions',confirm:'I checked the audio and every speaker assignment.',review:'Confirm speaker review',
 humanOnly:'Use human-only Speaking feedback',humanOnlyHelp:'This clears the AI-linked Speaking draft. Write your own observations and limitations. Writing feedback and overall next steps are unchanged.',
 candidate:'Participant',examiner:'Examiner',uncertain:'Uncertain',speaker:'Speaker',queued:'Feedback is queued. You can continue with human-only assessment.',
 unavailable:'Recording, consent or AI is unavailable. Human feedback remains available.',error:'Feedback could not be loaded or reviewed. Your examiner edits have not been replaced.',
 invalid:'The corrected speaker attribution invalidates the AI evidence. Do not apply it; write your own feedback instead.',replay:'Private Speaking recording',
 fluency:'Fluency and coherence',lexical:'Lexical resource',grammar:'Grammatical range and accuracy',pronunciation:'Pronunciation'},
 fr:{title:'Commentaires facultatifs sur l’oral',help:'Les suggestions de l’IA sont un brouillon, pas une note. Vérifiez l’enregistrement, la transcription et chaque attribution de parole avant de les appliquer. Les temps et citations sont des estimations du modèle, non des faits vérifiés.',
 queue:'Demander les commentaires sur l’oral',refresh:'Actualiser les commentaires sur l’oral',apply:'Appliquer les suggestions sur l’oral',confirm:'J’ai vérifié l’audio et chaque attribution de parole.',review:'Confirmer la vérification des locuteurs',
 humanOnly:'Utiliser des commentaires oraux entièrement humains',humanOnlyHelp:'Cette action efface le brouillon oral lié à l’IA. Rédigez vos propres observations et limites. Les commentaires écrits et les prochaines étapes générales restent inchangés.',
 candidate:'Participant',examiner:'Examinateur',uncertain:'Incertain',speaker:'Locuteur',queued:'Les commentaires sont en attente. Vous pouvez poursuivre l’évaluation humaine.',
 unavailable:'L’enregistrement, le consentement ou l’IA n’est pas disponible. L’évaluation humaine reste possible.',error:'Impossible de charger ou de vérifier les commentaires. Vos modifications n’ont pas été remplacées.',
 invalid:'L’attribution corrigée invalide les preuves de l’IA. N’appliquez pas ses suggestions ; rédigez vos propres commentaires.',replay:'Enregistrement privé de l’oral',
 fluency:'Fluidité et cohérence',lexical:'Ressources lexicales',grammar:'Étendue et précision grammaticales',pronunciation:'Prononciation'},
 ar:{title:'ملاحظات اختيارية للمحادثة',help:'اقتراحات الذكاء الاصطناعي مسودة وليست درجة. راجع التسجيل والتفريغ وهوية كل متحدث قبل تطبيقها. الأوقات والاقتباسات تقديرات للنموذج وليست حقائق موثقة.',
 queue:'طلب ملاحظات المحادثة',refresh:'تحديث ملاحظات المحادثة',apply:'تطبيق اقتراحات المحادثة',confirm:'راجعت التسجيل وهوية كل متحدث.',review:'تأكيد مراجعة المتحدثين',
 humanOnly:'استخدام ملاحظات بشرية فقط للمحادثة',humanOnlyHelp:'يمسح هذا الإجراء مسودة المحادثة المرتبطة بالذكاء الاصطناعي. اكتب ملاحظاتك وحدود التقييم بنفسك. تبقى ملاحظات الكتابة والخطوات العامة التالية دون تغيير.',
 candidate:'المشارك',examiner:'الممتحن',uncertain:'غير مؤكد',speaker:'المتحدث',queued:'الملاحظات في قائمة الانتظار. يمكنك متابعة التقييم البشري.',
 unavailable:'التسجيل أو الموافقة أو الذكاء الاصطناعي غير متاح. يبقى التقييم البشري متاحاً.',error:'تعذر تحميل الملاحظات أو مراجعتها. لم تُستبدل تعديلات الممتحن.',
 invalid:'تصحيح هوية المتحدث يبطل أدلة الذكاء الاصطناعي. لا تطبق الاقتراحات، واكتب ملاحظاتك الخاصة.',replay:'تسجيل المحادثة الخاص',
 fluency:'الطلاقة والترابط',lexical:'الثروة اللغوية',grammar:'التنوع والدقة النحوية',pronunciation:'النطق'},
};
