import type { en } from '@/i18n/en';

/**
 * Bangla.
 *
 * Deliberately typed as a *partial* of the English table. A missing key falls
 * back to English and warns in development, which is the behaviour that lets
 * this file grow screen by screen instead of having to land complete.
 *
 * Two things about the register used here.
 *
 * It is the plain Bangla a nurse would speak, not formal literary Bangla. This
 * is read by a frightened woman at three in the morning, so "রক্তচাপ" over
 * "রক্ত-সঞ্চাপ", and ordinary sentence shapes over elegant ones.
 *
 * Clinical vocabulary is left in English where that is what people actually
 * say. Bangladeshi clinics and mothers say "blood pressure", "sugar",
 * "ultrasound" — inventing pure-Bangla equivalents would be less
 * comprehensible, not more, and the app's job is to be understood. Where a
 * term is genuinely used in Bangla, Bangla is used.
 *
 * These strings have not been reviewed by a clinician or a professional
 * translator. That is fine for interface chrome, which is what this file is.
 * The care plan and the risk assessment are composed on the server and carry
 * their own note about review.
 */
export const bn: Partial<Record<keyof typeof en, string>> = {
  /* ------------------------------------------------------------ general */
  'app.name': 'MaternalCare+',
  'common.loading': 'লোড হচ্ছে…',
  'common.offline': 'এখন ক্লিনিকের সাথে যোগাযোগ করা যাচ্ছে না',
  'common.cancel': 'বাতিল',
  'common.save': 'সংরক্ষণ',
  'common.close': 'বন্ধ',
  'common.back': 'পেছনে',
  'common.seeAll': 'সব দেখুন',
  'common.today': 'আজ',
  'common.week': '{n} সপ্তাহ',
  'common.optional': 'ঐচ্ছিক',
  'common.required': 'আবশ্যক',

  /* ---------------------------------------------------------- language */
  'lang.title': 'ভাষা',
  'lang.choose': 'আপনার ভাষা বেছে নিন',
  'lang.partial': 'আপনি যে স্ক্রিনগুলো সবচেয়ে বেশি ব্যবহার করেন সেগুলো বাংলায় আছে। যা এখনো অনুবাদ হয়নি তা ইংরেজিতেই থাকবে।',
  'lang.saving': 'সংরক্ষণ হচ্ছে…',

  /* --------------------------------------------------------- mother nav */
  'nav.dashboard': 'ড্যাশবোর্ড',
  'nav.vitals': 'শারীরিক তথ্য',
  'nav.reminders': 'রিমাইন্ডার',
  'nav.doctor': 'ডাক্তার',
  'nav.community': 'কমিউনিটি',
  'nav.sos': 'জরুরি',

  /* --------------------------------------------------------- greetings */
  'greet.morning': 'শুভ সকাল, {name}',
  'greet.afternoon': 'শুভ অপরাহ্ন, {name}',
  'greet.evening': 'শুভ সন্ধ্যা, {name}',
  'greet.night': 'শুভ রাত্রি, {name}',
  'greet.pregnancy': 'আপনার গর্ভাবস্থা',

  /* -------------------------------------------------------------- risk */
  'risk.title': 'আপনার ঝুঁকি মূল্যায়ন',
  'risk.subtitle': 'একই তথ্য দুইভাবে দেখা — একটি নিয়মভিত্তিক হিসাব যা নিজের কারণ ব্যাখ্যা করে, আর একটি মডেল যা সত্যিকারের ক্লিনিকের রেকর্ড থেকে শেখানো।',
  'risk.rules.name': 'নিয়মভিত্তিক হিসাব',
  'risk.rules.sub': 'চিকিৎসার মানদণ্ড, স্পষ্ট করে লেখা',
  'risk.rules.what': 'এই স্কোর কেন হলো',
  'risk.model.name': 'শেখানো মডেল',
  'risk.model.sub': 'র‍্যান্ডম ফরেস্ট · {n}টি ক্লিনিক রেকর্ড',
  'risk.model.sure': '{n}% নিশ্চিত',
  'risk.model.down': 'মডেলটি এখন চালু নেই',
  'risk.model.downNote': 'বাঁ পাশের মূল্যায়ন ঠিকই আছে — এই অ্যাপ সবসময় সেটিই ব্যবহার করে এসেছে, আর সেটির জন্য মডেলের দরকার হয় না।',
  'risk.model.outside': 'মডেলটি এমন রিডিং আগে দেখেনি',
  'risk.model.assumedPulse': 'আপনার নাড়ির গতি লেখা হয়নি, তাই একটি সাধারণ মান ধরা হয়েছে।',
  'risk.model.clamped': 'আপনার কিছু রিডিং মডেলটির শেখা তথ্যের চেয়েও ভালো, তাই সবচেয়ে কাছের যে অবস্থা সে দেখেছে সেটির ভিত্তিতে বলা হয়েছে।',
  'risk.disagree': 'দুটি হিসাব মিলছে না',
  'risk.level.low': 'কম ঝুঁকি',
  'risk.level.medium': 'মাঝারি ঝুঁকি',
  'risk.level.high': 'বেশি ঝুঁকি',
  'risk.disclaimer': 'এর কোনোটিই রোগ নির্ণয় নয়। কোন বিষয়টি আপনার ডাক্তারকে বলা দরকার, শুধু সেটুকু জানানোই এদের কাজ।',

  /* --------------------------------------------------------- care plan */
  'plan.title': 'আপনার যত্নের পরিকল্পনা',
  'plan.subtitle': 'আপনি এখন যে অবস্থায় আছেন তার জন্য খাবার, চলাফেরা ও জীবনযাত্রা — প্রতিটি পরামর্শের সাথে বলা আছে সেটি আপনার কোন রিডিং থেকে এসেছে।',
  'plan.builtFrom': 'যা থেকে তৈরি',
  'plan.nutrition': 'খাবার',
  'plan.exercise': 'চলাফেরা',
  'plan.lifestyle': 'জীবনযাত্রা',
  'plan.nothing': 'এখানে এই মুহূর্তে বদলানোর কিছু নেই।',
  'plan.targets': 'দৈনিক লক্ষ্য',
  'plan.targetsFor': '{n} সপ্তাহের জন্য',
  'plan.targetsForStage': 'আপনার অবস্থার জন্য',
  'plan.notMeasured': 'এগুলো লক্ষ্য — আপনি কী খেয়েছেন তা নয়। এখানে খাবারের কোনো হিসাব রাখা হয় না, তাই এই তালিকার কোনো কিছুই আপনার মাপ নয়।',
  'plan.water': 'পানি',
  'plan.waterOf': '{target} লিটারের মধ্যে {had}',
  'plan.waterNotLogged': 'এখনো লেখা হয়নি',
  'plan.waterMeasured': 'আপনার লেখা {n} দিনের গড় — এই পাতায় এটিই একমাত্র মাপা সংখ্যা।',
  'plan.why': 'কেন আপনার জন্য',
  'plan.building': 'আপনার পরিকল্পনা তৈরি হচ্ছে…',
  'plan.needsRecord': 'আপনার পরিকল্পনার জন্য আপনার রেকর্ড দরকার, যেটিতে এখন পৌঁছানো যাচ্ছে না।',
  'plan.priority.urgent': 'এখনই',
  'plan.priority.high': 'শীঘ্রই',

  /* --------------------------------------------------------------- SOS */
  'sos.title': 'জরুরি সাহায্য',
  'sos.hold': 'পাঠাতে চেপে ধরুন',
  'sos.sending': 'আপনার অবস্থান পাঠানো হচ্ছে…',
  'sos.sent': 'আপনার লোকজনকে জানানো হয়েছে',
  'sos.call': '{number} নম্বরে কল করুন',
  'sos.ambulance': 'অ্যাম্বুলেন্স',
  'sos.contacts': 'আপনার জরুরি নম্বর',
  'sos.warning': 'বিপদের লক্ষণ — এখনই সাহায্য নিন',
  'sos.warningList': 'বেশি রক্তক্ষরণ · তীব্র মাথাব্যথার সাথে ঝাপসা দেখা · বাচ্চার নড়াচড়া কমে যাওয়া · ৩৮.৫°C এর বেশি জ্বর · হঠাৎ খুব বেশি ফুলে যাওয়া।',

  /* ------------------------------------------------------------ vitals */
  'vitals.title': 'আপনার রিডিং',
  'vitals.bp': 'রক্তচাপ',
  'vitals.sugar': 'রক্তে চিনি',
  'vitals.weight': 'ওজন',
  'vitals.temp': 'তাপমাত্রা',
  'vitals.pulse': 'নাড়ির গতি',
  'vitals.fetalHeart': 'বাচ্চার হৃদস্পন্দন',
  'vitals.noReadings': 'এখনো কোনো রিডিং নেই',
  'vitals.outOfRange': 'স্বাভাবিকের বাইরে',

  /* --------------------------------------------------------- check-in */
  'checkin.title': 'আজ কেমন আছেন?',
  'checkin.mood': 'মেজাজ',
  'checkin.kicks': 'নড়াচড়া',
  'checkin.water': 'পানি',
  'checkin.sleep': 'ঘুম',
  'checkin.saved': 'সংরক্ষিত',
  'checkin.notYet': 'আজকের তথ্য এখনো লেখা হয়নি',

  /* -------------------------------------------------------- reminders */
  'reminders.title': 'রিমাইন্ডার',
  'reminders.none': 'এখন কিছু বাকি নেই',
  'reminders.suggested': 'প্রস্তাবিত',
  'reminders.scheduleNow': 'এখনই ঠিক করুন',
  'reminders.vaccination': 'টিকার রেকর্ড',
  'reminders.markDone': 'হয়েছে চিহ্ন দিন',
  'reminders.card': 'কার্ড',
  'reminders.complete': 'সম্পন্ন',
  'reminders.due': 'বাকি',
  'reminders.done': 'হয়েছে',

  /* ----------------------------------------------------------- doctor */
  'doctor.title': 'আপনার ডাক্তার',
  'doctor.bookAppointment': 'অ্যাপয়েন্টমেন্ট নিন',
  'doctor.move': 'সময় বদলান',
  'doctor.withdraw': 'তুলে নিন',
  'doctor.endCare': 'চিকিৎসা শেষ করুন',
  'doctor.noReplies': 'এখনো কোনো উত্তর নেই',
  'doctor.writeTo': '{name} কে লিখুন…',

  /* -------------------------------------------------------- community */
  'community.title': 'কমিউনিটি',
  'community.ask': 'সবাইকে জিজ্ঞেস করুন',
  'community.reply': 'উত্তর',
  'community.replies': 'উত্তর',
  'community.report': 'রিপোর্ট',
  'community.reported': 'রিপোর্ট করা হয়েছে',
  'community.removed': 'এই উত্তরটি মডারেটর সরিয়ে দিয়েছেন।',
};
