/**
 * Privacy notice + consent wording (English / Bahasa Malaysia).
 *
 * STATUS: DRAFT. Written to the structure expected by the Malaysian PDPA 2010 notice guidance (purpose, source,
 * voluntariness, disclosure, retention, rights, contact, English + Bahasa Malaysia) but it has NOT been reviewed
 * by counsel. `npm run launch-check` fails in production until PRIVACY_NOTICE_STATUS is set to 'approved' after
 * review and the bracketed placeholders are completed. Bump PRIVACY_NOTICE_VERSION on every wording change: the
 * version a person consented to is stored with their consent record.
 */
export const PRIVACY_NOTICE_VERSION = '2026-10-draft-2';
export const PRIVACY_NOTICE_STATUS: 'draft' | 'approved' = 'draft';
export const MARKETING_NOTICE_VERSION = '2026-10-draft-1';

export type Locale = 'en' | 'ms';

export interface NoticeSection { heading: string; body: string[] }
export interface Notice { title: string; intro: string; sections: NoticeSection[] }

export interface NoticeParams { assessmentDays: number; reportDays: number; handoverHours: number }

export function privacyNotice(locale: Locale, p: NoticeParams): Notice {
  return locale === 'ms' ? noticeMs(p) : noticeEn(p);
}

function noticeEn(p: NoticeParams): Notice {
  return {
    title: 'Privacy Notice — R.I.S.E.™ Scorecard',
    intro: 'This notice explains how Balla DK ("we") handles personal data in the R.I.S.E.™ Scorecard, in line with the Personal Data Protection Act 2010 (Malaysia). A Bahasa Malaysia version is available.',
    sections: [
      { heading: 'What we collect', body: [
        'Your answers to the scorecard questions and the short profile questions, so we can calculate your result.',
        'Only if you ask for the detailed report: your first name and email address.',
        'Security data: a one-way hashed form of your network address, used only for abuse protection and rate limiting. We do not store your raw IP address with your answers.',
      ] },
      { heading: 'Why we use it', body: [
        'To calculate and show your free snapshot (no contact details are needed for this).',
        'To create your detailed report, give you a secure expiring link and email that link to you.',
        'To keep the service secure and prevent abuse.',
        `Only if you tap the WhatsApp button in your report: to create a private link to your report that only signed-in Balla DK staff can open, valid for ${p.handoverHours} hours. You see the message (your first name, score and priority titles, plus the link) and decide whether to send it. You can withdraw the link at any time.`,
        'Only if you tick the separate optional box: to send you educational updates by email. You can withdraw this at any time.',
      ] },
      { heading: 'Is it compulsory?', body: [
        'No. Giving your name and email is voluntary. If you do not, you can still see your free snapshot, but we cannot create the detailed report link.',
      ] },
      { heading: 'Where the data comes from', body: ['From you directly, through this website.'] },
      { heading: 'Who we share it with', body: [
        'We do not sell your data. We use service providers for hosting and email delivery under confidentiality obligations: [list providers before launch]. We disclose data to others only when the law requires it.',
      ] },
      { heading: 'How long we keep it', body: [
        `Assessments that were not turned into a report request are deleted after ${p.assessmentDays} days.`,
        `Report requests (name, email, answers and report link) are deleted after ${p.reportDays} days, or sooner if you use the “Delete my data” option in your report.`,
      ] },
      { heading: 'Your rights and how to contact us', body: [
        'You may ask to access, correct or delete your personal data, withdraw consent or limit how we use it. Contact: [privacy contact name, email and postal address — complete before launch].',
        'You may also use “Delete my data” inside your report to erase it immediately.',
      ] },
      { heading: 'How we protect it', body: [
        'Names, emails and answers are encrypted in storage, access links are random, expire and are stored only in hashed form, and administrator access is restricted by role and logged.',
      ] },
      { heading: 'About the scorecard', body: [
        'The R.I.S.E.™ Scorecard is an educational self-assessment. It is not regulated financial, investment, tax or legal advice, and it does not recommend any product.',
      ] },
    ],
  };
}

function noticeMs(p: NoticeParams): Notice {
  return {
    title: 'Notis Privasi — Kad Skor R.I.S.E.™',
    intro: 'Notis ini menerangkan cara Balla DK ("kami") mengendalikan data peribadi dalam Kad Skor R.I.S.E.™, selaras dengan Akta Perlindungan Data Peribadi 2010 (Malaysia). Versi Bahasa Inggeris juga disediakan.',
    sections: [
      { heading: 'Data yang kami kumpulkan', body: [
        'Jawapan anda kepada soalan kad skor dan soalan profil ringkas, supaya kami dapat mengira keputusan anda.',
        'Hanya jika anda meminta laporan terperinci: nama pertama dan alamat e-mel anda.',
        'Data keselamatan: bentuk cincang sehala bagi alamat rangkaian anda, digunakan hanya untuk perlindungan penyalahgunaan dan had kadar. Kami tidak menyimpan alamat IP mentah anda bersama jawapan anda.',
      ] },
      { heading: 'Tujuan penggunaan', body: [
        'Untuk mengira dan memaparkan gambaran ringkas percuma anda (tiada butiran hubungan diperlukan).',
        'Untuk menyediakan laporan terperinci anda, memberi pautan selamat yang tamat tempoh, dan menghantar pautan itu melalui e-mel.',
        'Untuk memastikan perkhidmatan selamat dan mencegah penyalahgunaan.',
        `Hanya jika anda menekan butang WhatsApp dalam laporan anda: untuk mencipta pautan peribadi ke laporan anda yang hanya boleh dibuka oleh kakitangan Balla DK yang log masuk, sah selama ${p.handoverHours} jam. Anda melihat mesej itu (nama pertama, skor dan tajuk keutamaan anda, serta pautan) dan memutuskan sama ada untuk menghantarnya. Anda boleh menarik balik pautan pada bila-bila masa.`,
        'Hanya jika anda menanda kotak pilihan yang berasingan: untuk menghantar kemas kini pendidikan melalui e-mel. Anda boleh menarik balik persetujuan ini pada bila-bila masa.',
      ] },
      { heading: 'Adakah wajib?', body: [
        'Tidak. Memberi nama dan e-mel adalah secara sukarela. Jika tidak, anda masih boleh melihat gambaran ringkas percuma, tetapi kami tidak dapat menyediakan pautan laporan terperinci.',
      ] },
      { heading: 'Sumber data', body: ['Daripada anda sendiri, melalui laman web ini.'] },
      { heading: 'Pendedahan kepada pihak lain', body: [
        'Kami tidak menjual data anda. Kami menggunakan penyedia perkhidmatan untuk pengehosan dan penghantaran e-mel di bawah obligasi kerahsiaan: [senaraikan penyedia sebelum pelancaran]. Kami hanya mendedahkan data kepada pihak lain apabila dikehendaki oleh undang-undang.',
      ] },
      { heading: 'Tempoh penyimpanan', body: [
        `Penilaian yang tidak dijadikan permintaan laporan dipadam selepas ${p.assessmentDays} hari.`,
        `Permintaan laporan (nama, e-mel, jawapan dan pautan laporan) dipadam selepas ${p.reportDays} hari, atau lebih awal jika anda menggunakan pilihan “Padam data saya” dalam laporan anda.`,
      ] },
      { heading: 'Hak anda dan cara menghubungi kami', body: [
        'Anda boleh meminta akses, pembetulan atau pemadaman data peribadi anda, menarik balik persetujuan atau menghadkan penggunaannya. Hubungi: [nama, e-mel dan alamat pos pegawai privasi — lengkapkan sebelum pelancaran].',
        'Anda juga boleh menggunakan “Padam data saya” dalam laporan anda untuk memadamkannya serta-merta.',
      ] },
      { heading: 'Cara kami melindungi data', body: [
        'Nama, e-mel dan jawapan disulitkan dalam storan, pautan akses adalah rawak, tamat tempoh dan disimpan hanya dalam bentuk cincang, dan akses pentadbir dihadkan mengikut peranan serta direkodkan.',
      ] },
      { heading: 'Tentang kad skor', body: [
        'Kad Skor R.I.S.E.™ ialah penilaian kendiri berbentuk pendidikan. Ia bukan nasihat kewangan, pelaburan, cukai atau undang-undang yang dikawal selia, dan ia tidak mengesyorkan sebarang produk.',
      ] },
    ],
  };
}

export const CONSENT_TEXT: Record<'processing' | 'marketing', Record<Locale, string>> = {
  processing: {
    en: 'I agree that Balla DK may use my first name and email address to create and deliver the R.I.S.E.™ report I have requested, as described in the Privacy Notice.',
    ms: 'Saya bersetuju Balla DK menggunakan nama pertama dan alamat e-mel saya untuk menyediakan dan menghantar laporan R.I.S.E.™ yang saya minta, seperti yang dinyatakan dalam Notis Privasi.',
  },
  marketing: {
    en: 'Optional: I would also like to receive educational updates from Balla DK by email. I can withdraw this at any time.',
    ms: 'Pilihan: Saya juga ingin menerima kemas kini pendidikan daripada Balla DK melalui e-mel. Saya boleh menarik balik persetujuan ini pada bila-bila masa.',
  },
};
