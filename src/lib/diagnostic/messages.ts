export type DiagnosticLocale = 'en' | 'fr' | 'ar';

const en = {
  title: 'Your short diagnostic', eyebrow: 'Diagnostic · invitation only',
  intro: '60 minutes of written work: Listening, Reading and Writing, 20 minutes each. Speaking takes 7 minutes in person, arranged separately.',
  conditions: 'This is a shortened diagnostic, not a full IELTS mock or an official IELTS result. Feedback is diagnostic only; Writing covers Task 2 under shortened conditions.',
  invitations: 'Your free invitations', invitation: 'Invitation', available: 'Available', expired: 'Expired', revoked: 'Revoked', used: 'Already started', submittedStatus: 'Submitted',
  account: 'This invitation is linked to your signed-in account. It does not use a full-mock purchase.',
  noInvitations: 'No invitation is available. Please contact IELTS Lab staff.', expires: 'Start before',
  soundTitle: 'Check your sound before you start', soundHelp: 'Connect your headphones, check the volume and play the short tone. This check is untimed and does not use your microphone.',
  playTone: 'Play test tone', playingTone: 'Playing tone…', heardTone: 'I heard the tone clearly', toneFailed: 'Sound could not play. Check your device and browser audio settings, then try again.',
  start: 'Start diagnostic', resume: 'Resume diagnostic', busy: 'Please wait…', notReady: 'The diagnostic content is not ready. Staff must confirm the source material before you can start.',
  listening: 'Listening', reading: 'Reading', writing: 'Writing', minutes: 'min', remaining: 'Time remaining', stage: 'Written stage', of: 'of',
  saved: 'Saved', saving: 'Saving…', offlineSave: 'Not saved · offline', conflict: 'Save conflict · editing paused', online: 'Connected', offline: 'Offline · reconnect to save',
  unacknowledged: 'Awaiting save confirmation', noPending: 'No pending changes', unanswered: 'Not answered yet', blocked: 'Editing is paused. Reconnect or contact staff to recover your session.',
  group: 'Question group', previous: 'Previous group', next: 'Next group', question: 'Question', answer: 'Answer', select: 'Choose an option', clear: 'Clear answer', clearGroup: 'Clear selected answers',
  chooseUpTo: 'Select up to', selected: 'selected', review: 'Mark for review', removeReview: 'Remove review mark', reviews: 'Review marks',
  unsupported: 'This exercise cannot be displayed safely. Answers are disabled. Please contact staff; the timer is not extended automatically.',
  unavailable: 'The current section is unavailable. Please contact staff.', passage: 'Reading passage', source: 'Source content',
  audio: 'Listening audio', audioHelp: 'Use only the audio supplied for this section. Playback and recovery rules are controlled by the session.',
  audioFailed: 'The audio is unavailable. Check your connection and contact staff. Your session time is not extended automatically.',
  essay: 'Your Task 2 response', writingContext: 'Shortened conditions: 20 minutes for Task 2. The original source instructions below are unchanged.',
  words: 'words', characterLimit: 'Maximum 20,000 characters',
  submit: 'Submit written work', confirmTitle: 'Submit your written work?', confirmHelp: 'This is irreversible. You will no longer be able to change your written answers. Speaking is arranged separately; feedback is not yet released.',
  unsaved: 'Responses awaiting save confirmation', waitSave: 'Wait for saving or conflicts to resolve before submitting. Offline responses have not been acknowledged by the server.',
  confirmSubmit: 'Confirm submission', cancel: 'Keep working', submitting: 'Submitting…',
  receipt: 'Written work submitted', receiptHelp: 'Your written submission has been received. Speaking is handled separately. Feedback will appear only after the required assessment and review; no report is available here yet.',
  timeEnded: 'Written time has ended', timeEndedHelp: 'Answers are read-only. Submission will be confirmed by the server; this screen does not yet confirm receipt.',
  cancelled: 'Session unavailable', cancelledHelp: 'This session is no longer active. Please contact staff.',
  genericError: 'We could not complete this action. Please try again or contact staff.',
  accessError: 'This invitation is unavailable or no longer valid. Please contact staff.',
  contentError: 'Approved diagnostic content is not available. Please contact staff.',
  leaseError: 'This session is open elsewhere or its editing access has expired. Reconnect to resume safely.',
  staleError: 'A newer response is already saved. Editing is paused to protect your work; refresh the session before continuing.',
  sessionError: 'This session or section is no longer writable. Reconnect to check its current status.',
};
type DiagnosticMessages = { [K in keyof typeof en]: string };
const fr: DiagnosticMessages = {
  title: 'Votre diagnostic court', eyebrow: 'Diagnostic · sur invitation',
  intro: '60 minutes d’épreuves écrites : compréhension orale, compréhension écrite et expression écrite, 20 minutes chacune. L’expression orale dure 7 minutes en présentiel, organisée séparément.',
  conditions: 'Il s’agit d’un diagnostic raccourci, pas d’un examen blanc complet ni d’un résultat officiel IELTS. Les commentaires sont uniquement diagnostiques ; l’écrit porte sur la tâche 2 dans un temps réduit.',
  invitations: 'Vos invitations gratuites', invitation: 'Invitation', available: 'Disponible', expired: 'Expirée', revoked: 'Révoquée', used: 'Déjà commencée', submittedStatus: 'Soumis',
  account: 'Cette invitation est liée à votre compte connecté. Elle n’utilise pas un achat d’examen blanc complet.',
  noInvitations: 'Aucune invitation disponible. Veuillez contacter l’équipe IELTS Lab.', expires: 'Commencer avant le',
  soundTitle: 'Vérifiez le son avant de commencer', soundHelp: 'Branchez votre casque, réglez le volume puis écoutez le signal sonore. Cette vérification n’est pas chronométrée et n’utilise pas votre microphone.',
  playTone: 'Écouter le signal', playingTone: 'Signal en cours…', heardTone: 'J’ai entendu clairement le signal', toneFailed: 'Le son n’a pas pu être lu. Vérifiez les réglages audio de votre appareil et du navigateur, puis réessayez.',
  start: 'Commencer le diagnostic', resume: 'Reprendre le diagnostic', busy: 'Veuillez patienter…', notReady: 'Le contenu du diagnostic n’est pas prêt. L’équipe doit vérifier les documents sources avant le démarrage.',
  listening: 'Compréhension orale', reading: 'Compréhension écrite', writing: 'Expression écrite', minutes: 'min', remaining: 'Temps restant', stage: 'Étape écrite', of: 'sur',
  saved: 'Enregistré', saving: 'Enregistrement…', offlineSave: 'Non enregistré · hors connexion', conflict: 'Conflit d’enregistrement · saisie suspendue', online: 'Connecté', offline: 'Hors connexion · reconnectez-vous pour enregistrer',
  unacknowledged: 'Confirmation d’enregistrement attendue', noPending: 'Aucune modification en attente', unanswered: 'Pas encore de réponse', blocked: 'La saisie est suspendue. Reconnectez-vous ou contactez l’équipe pour récupérer votre session.',
  group: 'Groupe de questions', previous: 'Groupe précédent', next: 'Groupe suivant', question: 'Question', answer: 'Réponse', select: 'Choisir une option', clear: 'Effacer la réponse', clearGroup: 'Effacer les réponses sélectionnées',
  chooseUpTo: 'Sélectionnez au maximum', selected: 'sélectionnées', review: 'Marquer pour révision', removeReview: 'Retirer le repère de révision', reviews: 'Repères de révision',
  unsupported: 'Cet exercice ne peut pas être affiché correctement. Les réponses sont désactivées. Contactez l’équipe ; le temps n’est pas prolongé automatiquement.',
  unavailable: 'La section actuelle n’est pas disponible. Contactez l’équipe.', passage: 'Texte de compréhension écrite', source: 'Document source',
  audio: 'Audio de compréhension orale', audioHelp: 'Utilisez uniquement l’audio fourni pour cette section. La session contrôle les règles de lecture et de reprise.',
  audioFailed: 'L’audio est indisponible. Vérifiez votre connexion et contactez l’équipe. Le temps n’est pas prolongé automatiquement.',
  essay: 'Votre réponse à la tâche 2', writingContext: 'Conditions raccourcies : 20 minutes pour la tâche 2. Les consignes originales ci-dessous sont inchangées.',
  words: 'mots', characterLimit: '20 000 caractères maximum',
  submit: 'Soumettre l’écrit', confirmTitle: 'Soumettre vos réponses écrites ?', confirmHelp: 'Cette action est irréversible. Vous ne pourrez plus modifier vos réponses écrites. L’oral est organisé séparément ; les commentaires ne sont pas encore publiés.',
  unsaved: 'Réponses en attente de confirmation d’enregistrement', waitSave: 'Attendez la fin des enregistrements et la résolution des conflits avant de soumettre. Le serveur n’a pas confirmé les réponses hors connexion.',
  confirmSubmit: 'Confirmer la soumission', cancel: 'Continuer à travailler', submitting: 'Soumission en cours…',
  receipt: 'Écrit soumis', receiptHelp: 'Vos réponses écrites ont été reçues. L’oral est organisé séparément. Les commentaires seront disponibles après les évaluations et validations nécessaires ; aucun rapport n’est encore disponible ici.',
  timeEnded: 'Le temps de l’écrit est écoulé', timeEndedHelp: 'Les réponses sont en lecture seule. Le serveur doit confirmer la soumission ; cet écran ne confirme pas encore leur réception.',
  cancelled: 'Session indisponible', cancelledHelp: 'Cette session n’est plus active. Contactez l’équipe.',
  genericError: 'Cette action n’a pas pu aboutir. Réessayez ou contactez l’équipe.', accessError: 'Cette invitation est indisponible ou n’est plus valide. Contactez l’équipe.',
  contentError: 'Le contenu validé du diagnostic est indisponible. Contactez l’équipe.', leaseError: 'Cette session est ouverte ailleurs ou son accès de saisie a expiré. Reconnectez-vous pour reprendre sans risque.',
  staleError: 'Une réponse plus récente est déjà enregistrée. La saisie est suspendue pour protéger votre travail ; actualisez la session avant de continuer.', sessionError: 'Cette session ou section n’accepte plus de modifications. Reconnectez-vous pour vérifier son état.',
};
const ar: DiagnosticMessages = {
  title: 'اختبارك التشخيصي القصير', eyebrow: 'اختبار تشخيصي · بدعوة فقط',
  intro: '60 دقيقة للعمل الكتابي: الاستماع والقراءة والكتابة، 20 دقيقة لكل مهارة. يستغرق التحدث 7 دقائق حضورياً ويُنظَّم بشكل منفصل.',
  conditions: 'هذا اختبار تشخيصي مختصر، وليس اختبار IELTS تجريبياً كاملاً أو نتيجة IELTS رسمية. الملاحظات تشخيصية فقط؛ تشمل الكتابة المهمة الثانية في وقت مختصر.',
  invitations: 'دعواتك المجانية', invitation: 'الدعوة', available: 'متاحة', expired: 'منتهية', revoked: 'ملغاة', used: 'بدأت بالفعل', submittedStatus: 'تم التسليم',
  account: 'هذه الدعوة مرتبطة بحسابك المسجَّل. لا تستخدم رصيد اختبار تجريبي كامل مدفوع.',
  noInvitations: 'لا توجد دعوة متاحة. يرجى التواصل مع فريق IELTS Lab.', expires: 'ابدأ قبل',
  soundTitle: 'تحقّق من الصوت قبل البدء', soundHelp: 'وصّل سماعاتك واضبط مستوى الصوت وشغّل النغمة القصيرة. هذا الفحص غير مؤقّت ولا يستخدم الميكروفون.',
  playTone: 'تشغيل نغمة الاختبار', playingTone: 'جارٍ تشغيل النغمة…', heardTone: 'سمعت النغمة بوضوح', toneFailed: 'تعذّر تشغيل الصوت. تحقّق من إعدادات الصوت في الجهاز والمتصفح ثم حاول مجدداً.',
  start: 'بدء الاختبار التشخيصي', resume: 'استئناف الاختبار التشخيصي', busy: 'يرجى الانتظار…', notReady: 'محتوى الاختبار التشخيصي غير جاهز. يجب أن يتحقّق الفريق من المصادر قبل البدء.',
  listening: 'الاستماع', reading: 'القراءة', writing: 'الكتابة', minutes: 'دقيقة', remaining: 'الوقت المتبقي', stage: 'المرحلة الكتابية', of: 'من',
  saved: 'تم الحفظ', saving: 'جارٍ الحفظ…', offlineSave: 'لم يُحفظ · دون اتصال', conflict: 'تعارض في الحفظ · التعديل متوقف', online: 'متصل', offline: 'دون اتصال · أعد الاتصال للحفظ',
  unacknowledged: 'بانتظار تأكيد الحفظ', noPending: 'لا توجد تغييرات معلّقة', unanswered: 'لم تتم الإجابة بعد', blocked: 'التعديل متوقف. أعد الاتصال أو تواصل مع الفريق لاستعادة جلستك.',
  group: 'مجموعة الأسئلة', previous: 'المجموعة السابقة', next: 'المجموعة التالية', question: 'السؤال', answer: 'الإجابة', select: 'اختر خياراً', clear: 'مسح الإجابة', clearGroup: 'مسح الإجابات المختارة',
  chooseUpTo: 'اختر حتى', selected: 'مختارة', review: 'وضع علامة للمراجعة', removeReview: 'إزالة علامة المراجعة', reviews: 'علامات المراجعة',
  unsupported: 'لا يمكن عرض هذا التمرين بشكل آمن. الإجابات معطّلة. يرجى التواصل مع الفريق؛ لا يُمدَّد الوقت تلقائياً.',
  unavailable: 'القسم الحالي غير متاح. يرجى التواصل مع الفريق.', passage: 'نص القراءة', source: 'المحتوى الأصلي',
  audio: 'صوت الاستماع', audioHelp: 'استخدم فقط الصوت المقدَّم لهذا القسم. تتحكّم الجلسة في قواعد التشغيل والاستئناف.',
  audioFailed: 'الصوت غير متاح. تحقّق من اتصالك وتواصل مع الفريق. لا يُمدَّد وقت الجلسة تلقائياً.',
  essay: 'إجابتك عن المهمة الثانية', writingContext: 'شروط مختصرة: 20 دقيقة للمهمة الثانية. التعليمات الأصلية أدناه دون تغيير.',
  words: 'كلمة', characterLimit: 'الحد الأقصى 20,000 حرف',
  submit: 'تسليم العمل الكتابي', confirmTitle: 'هل تريد تسليم عملك الكتابي؟', confirmHelp: 'لا يمكن التراجع عن هذه الخطوة. لن تتمكّن من تعديل إجاباتك الكتابية. يُنظَّم التحدث بشكل منفصل؛ لم تُنشر الملاحظات بعد.',
  unsaved: 'إجابات بانتظار تأكيد الحفظ', waitSave: 'انتظر انتهاء الحفظ وحلّ التعارضات قبل التسليم. لم يؤكّد الخادم الإجابات المكتوبة دون اتصال.',
  confirmSubmit: 'تأكيد التسليم', cancel: 'متابعة العمل', submitting: 'جارٍ التسليم…',
  receipt: 'تم تسليم العمل الكتابي', receiptHelp: 'تم استلام عملك الكتابي. يُنظَّم التحدث بشكل منفصل. ستظهر الملاحظات بعد التقييم والمراجعة المطلوبين؛ لا يتوفر تقرير هنا بعد.',
  timeEnded: 'انتهى وقت العمل الكتابي', timeEndedHelp: 'الإجابات للقراءة فقط. سيؤكّد الخادم التسليم؛ لا تؤكّد هذه الشاشة استلامه بعد.',
  cancelled: 'الجلسة غير متاحة', cancelledHelp: 'هذه الجلسة لم تعد نشطة. يرجى التواصل مع الفريق.',
  genericError: 'تعذّر إكمال هذا الإجراء. حاول مجدداً أو تواصل مع الفريق.', accessError: 'هذه الدعوة غير متاحة أو لم تعد صالحة. تواصل مع الفريق.',
  contentError: 'المحتوى المعتمد للاختبار التشخيصي غير متاح. تواصل مع الفريق.', leaseError: 'هذه الجلسة مفتوحة في مكان آخر أو انتهت صلاحية التعديل. أعد الاتصال للاستئناف بأمان.',
  staleError: 'تم حفظ إجابة أحدث بالفعل. أُوقف التعديل لحماية عملك؛ حدّث الجلسة قبل المتابعة.', sessionError: 'لم تعد هذه الجلسة أو المرحلة تقبل التعديل. أعد الاتصال للتحقّق من حالتها.',
};

export const diagnosticMessages = { en, fr, ar };

/** Unknown/internal errors are deliberately never echoed to the learner. */
export function diagnosticErrorMessage(locale: DiagnosticLocale, code?: string): string | null {
  if (!code) return null;
  const m = diagnosticMessages[locale];
  if (/INVITATION|ACCESS|ACCOUNT|OWNER|UNAUTHORIZED|FORBIDDEN|STAFF/u.test(code)) return m.accessError;
  if (/CONTENT|REVIEW|MANIFEST|BLUEPRINT|SOURCE|AUDIO/u.test(code)) return m.contentError;
  if (/LEASE|WRITER/u.test(code)) return m.leaseError;
  if (/STALE|REVISION|CONFLICT/u.test(code)) return m.staleError;
  if (/SESSION|SECTION|EXPIRED|DEADLINE/u.test(code)) return m.sessionError;
  return m.genericError;
}
