/**
 * English — the source of truth.
 *
 * Every key that exists anywhere must exist here, because English is what the
 * app falls back to when another language has no entry. Keys read
 * `screen.thing`, and a key is never assembled at runtime from a variable:
 * `t('nav.' + tab)` cannot be typechecked and cannot be found by a search,
 * which is how translations quietly rot.
 *
 * Values may contain `{holes}` filled from an object at the call site. Keep the
 * whole sentence in one key. Splitting "You are in week" + n + "of your
 * pregnancy" into three assumes English word order, and Bangla does not share
 * it.
 */
export const en = {
  /* ------------------------------------------------------------ general */
  'app.name': 'MaternalCare+',
  'common.loading': 'Loading…',
  'common.offline': 'Cannot reach the clinic right now',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.close': 'Close',
  'common.back': 'Back',
  'common.seeAll': 'See all',
  'common.today': 'Today',
  'common.week': 'Week {n}',
  'common.optional': 'optional',
  'common.required': 'required',

  /* ---------------------------------------------------------- language */
  'lang.title': 'Language',
  'lang.choose': 'Choose your language',
  'lang.partial': 'Bangla covers the screens you use most. Anything not yet translated stays in English.',
  'lang.saving': 'Saving…',

  /* --------------------------------------------------------- mother nav */
  'nav.dashboard': 'Dashboard',
  'nav.vitals': 'Vitals',
  'nav.reminders': 'Reminders',
  'nav.doctor': 'Doctor',
  'nav.community': 'Community',
  'nav.sos': 'SOS',

  /* --------------------------------------------------------- greetings */
  'greet.morning': 'Good morning, {name}',
  'greet.afternoon': 'Good afternoon, {name}',
  'greet.evening': 'Good evening, {name}',
  'greet.night': 'Good night, {name}',
  'greet.pregnancy': 'YOUR PREGNANCY',

  /* -------------------------------------------------------------- risk */
  'risk.title': 'Your risk assessment',
  'risk.subtitle': 'Two independent readings of the same vitals — a rule engine that explains itself, and a model trained on real clinic records.',
  'risk.rules.name': 'Rule engine',
  'risk.rules.sub': 'Clinical thresholds, written out',
  'risk.rules.what': 'What made this score',
  'risk.model.name': 'Trained model',
  'risk.model.sub': 'Random forest · {n} clinic records',
  'risk.model.sure': '{n}% sure',
  'risk.model.down': 'The model is not running',
  'risk.model.downNote': 'Your assessment on the left is unaffected — it is the one this app has always used, and it does not need the model to work.',
  'risk.model.outside': 'Outside what the model has seen',
  'risk.model.assumedPulse': 'Your pulse has not been logged, so a typical value was used.',
  'risk.model.clamped': 'Some of your readings are healthier than anything in its training data, so it was asked about the closest case it has seen.',
  'risk.disagree': 'The two do not agree',
  'risk.level.low': 'Low Risk',
  'risk.level.medium': 'Medium Risk',
  'risk.level.high': 'High Risk',
  'risk.disclaimer': 'Neither of these is a diagnosis. They exist to tell you when something is worth raising with the person treating you, and that is all.',

  /* --------------------------------------------------------- care plan */
  'plan.title': 'Your care plan',
  'plan.subtitle': 'Nutrition, movement and lifestyle for where you are — every line says which of your own readings it came from.',
  'plan.builtFrom': 'Built from',
  'plan.nutrition': 'Nutrition',
  'plan.exercise': 'Movement',
  'plan.lifestyle': 'Lifestyle',
  'plan.nothing': 'Nothing to change here right now.',
  'plan.targets': 'Daily targets',
  'plan.targetsFor': 'For week {n}',
  'plan.targetsForStage': 'For your stage',
  'plan.notMeasured': 'What to aim for — not what you have eaten. There is no food diary here, so nothing on this list is a measurement of you.',
  'plan.water': 'Water',
  'plan.waterOf': '{had} of {target} L',
  'plan.waterNotLogged': 'Not logged yet',
  'plan.waterMeasured': 'Your average across {n} logged days — the one figure here that is measured.',
  'plan.why': 'Why you',
  'plan.building': 'Building your plan…',
  'plan.needsRecord': 'Your plan needs your record, and we cannot reach it right now.',
  'plan.priority.urgent': 'Now',
  'plan.priority.high': 'Soon',

  /* --------------------------------------------------------------- SOS */
  'sos.title': 'Emergency SOS',
  'sos.hold': 'Hold to send',
  'sos.sending': 'Sending your location…',
  'sos.sent': 'Your contacts have been told',
  'sos.call': 'Call {number}',
  'sos.ambulance': 'Ambulance',
  'sos.contacts': 'Your emergency contacts',
  'sos.warning': 'Warning signs — get help now',
  'sos.warningList': 'Heavy bleeding · severe headache with blurred vision · reduced movement · fever above 38.5°C · sudden severe swelling.',

  /* ------------------------------------------------------------ vitals */
  'vitals.title': 'Your readings',
  'vitals.bp': 'Blood pressure',
  'vitals.sugar': 'Blood sugar',
  'vitals.weight': 'Weight',
  'vitals.temp': 'Temperature',
  'vitals.pulse': 'Pulse',
  'vitals.fetalHeart': 'Baby’s heartbeat',
  'vitals.noReadings': 'No readings yet',
  'vitals.outOfRange': 'Outside the usual range',

  /* --------------------------------------------------------- check-in */
  'checkin.title': 'How are you today?',
  'checkin.mood': 'Mood',
  'checkin.kicks': 'Movements',
  'checkin.water': 'Water',
  'checkin.sleep': 'Sleep',
  'checkin.saved': 'Saved',
  'checkin.notYet': 'You have not completed your daily check-in yet',

  /* -------------------------------------------------------- reminders */
  'reminders.title': 'Reminders',
  'reminders.none': 'Nothing due',
  'reminders.suggested': 'Suggested',
  'reminders.scheduleNow': 'Schedule now',
  'reminders.vaccination': 'Vaccination record',
  'reminders.markDone': 'Mark done',
  'reminders.card': 'Card',
  'reminders.complete': 'complete',
  'reminders.due': 'due',
  'reminders.done': 'done',

  /* ----------------------------------------------------------- doctor */
  'doctor.title': 'Your doctor',
  'doctor.bookAppointment': 'Book an appointment',
  'doctor.move': 'Move',
  'doctor.withdraw': 'Withdraw',
  'doctor.endCare': 'End care',
  'doctor.noReplies': 'No replies yet',
  'doctor.writeTo': 'Write to {name}…',

  /* -------------------------------------------------------- community */
  'community.title': 'Community',
  'community.ask': 'Ask the community',
  'community.reply': 'reply',
  'community.replies': 'replies',
  'community.report': 'Report',
  'community.reported': 'Reported',
  'community.removed': 'This reply was removed by a moderator.',
} as const;
