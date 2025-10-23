type LegalSection = {
  heading?: string
  content: string[]
  list?: string[]
}

type LegalPage = {
  title: string
  lastUpdated: string
  sections: LegalSection[]
  contactEmail?: string
}

type LegalContent = {
  [key: string]: LegalPage
}

export const legalContent: LegalContent = {
  dmca: {
    title: "DMCA Policy",
    lastUpdated: "October 23, 2025",
    contactEmail: "dmca@mediakeepa.com",
    sections: [
      {
        content: [
          "MediaKeepa respects the intellectual property rights of others and expects its users to do the same. In accordance with the Digital Millennium Copyright Act of 1998 (DMCA), we will respond expeditiously to claims of copyright infringement committed using our service.",
          "IMPORTANT: MediaKeepa is a tool provider only. We do NOT host, store, upload, or distribute any copyrighted content. All content is downloaded directly from third-party platforms. We have no control over the content available on those platforms.",
        ],
      },
      {
        heading: "Notice of Infringement",
        content: [
          "If you are a copyright owner, or authorized to act on behalf of one, and believe that any content on MediaKeepa infringes upon your copyrights, you may submit a notification pursuant to the DMCA by providing our Copyright Agent with the following information in writing:",
        ],
        list: [
          "A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed",
          "Identification of the copyrighted work claimed to have been infringed, or, if multiple copyrighted works are covered by a single notification, a representative list of such works",
          "Identification of the material that is claimed to be infringing or to be the subject of infringing activity and that is to be removed or access to which is to be disabled",
          "Information reasonably sufficient to permit the service provider to contact you, such as an address, telephone number, and email address",
          "A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law",
          "A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed",
        ],
      },
      {
        heading: "Counter-Notification",
        content: [
          "If you believe that your content that was removed (or to which access was disabled) is not infringing, or that you have the authorization from the copyright owner, the copyright owner's agent, or pursuant to the law, to upload and use the content, you may send a written counter-notice containing the following information:",
        ],
        list: [
          "Your physical or electronic signature",
          "Identification of the content that has been removed or to which access has been disabled and the location at which the content appeared before it was removed or disabled",
          "A statement that you have a good faith belief that the content was removed or disabled as a result of mistake or a misidentification of the content",
          "Your name, address, telephone number, and email address, and a statement that you consent to the jurisdiction of the federal court and that you will accept service of process from the person who provided notification of the alleged infringement",
        ],
      },
      {
        heading: "Repeat Infringers",
        content: [
          "In accordance with the DMCA and other applicable law, MediaKeepa has adopted a policy of terminating, in appropriate circumstances, users who are deemed to be repeat infringers. MediaKeepa may also at its sole discretion limit access to the service and/or terminate the accounts of any users who infringe any intellectual property rights of others.",
        ],
      },
      {
        heading: "Important Disclaimer",
        content: [
          "MediaKeepa is a SOFTWARE TOOL ONLY. We do not host, store, transmit, or distribute any copyrighted content whatsoever. Our service functions similarly to a web browser - it facilitates access to publicly available content that users request.",
          "All downloads are performed directly from the original source platforms (YouTube, TikTok, etc.). MediaKeepa merely acts as a technical facilitator, similar to how a web browser displays web pages.",
          "By using MediaKeepa, you agree to:",
        ],
        list: [
          "Only download content that you have the legal right to access and use",
          "Comply with all applicable copyright laws and the terms of service of source platforms",
          "Download only content that is in the public domain, content you own, content you created, or content for which you have obtained proper authorization",
          "Accept full legal responsibility for your downloads - MediaKeepa is not liable for your use of downloaded content",
          "Understand that MediaKeepa does not verify, endorse, or take responsibility for any content downloaded through our tool",
        ],
      },
      {
        heading: "No Liability for User Actions",
        content: [
          "MediaKeepa explicitly disclaims any liability for copyright infringement or illegal use of downloaded content by users. You, the user, are solely responsible for ensuring your compliance with all applicable laws.",
          "If you receive a DMCA notice or copyright complaint related to content you downloaded, you must handle it directly - MediaKeepa is not a party to your downloads and cannot assist with copyright disputes.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    lastUpdated: "October 23, 2025",
    sections: [
      {
        content: [
          "Welcome to MediaKeepa. By accessing or using our service, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.",
          "READ CAREFULLY: These terms contain important information about your legal rights and obligations, including limitations on MediaKeepa's liability.",
        ],
      },
      {
        heading: "1. Description of Service",
        content: [
          "MediaKeepa is a SOFTWARE TOOL that facilitates downloading publicly available media content from various online platforms. CRITICAL: MediaKeepa does NOT host, store, transmit, upload, or distribute any content. We are a tool provider only.",
          "Our service works similarly to a web browser or download manager - it processes user requests and facilitates technical connections to third-party platforms. We have no control over, and do not monitor, verify, or endorse any content accessed through our tool.",
        ],
      },
      {
        heading: "2. User Responsibilities",
        content: [
          "YOU ARE SOLELY AND COMPLETELY RESPONSIBLE for your use of MediaKeepa and for any content you download. By using this service, you explicitly agree to:",
        ],
        list: [
          "Only download content that you have the legal right to access, possess, and use",
          "Comply with ALL applicable laws and regulations, including but not limited to copyright laws, DMCA, and intellectual property laws",
          "Not use the service for any illegal, unauthorized, or infringing purpose whatsoever",
          "Not violate the terms of service, policies, or rules of any third-party platforms",
          "Respect intellectual property rights of content creators, copyright holders, and rights owners",
          "Not use the service to download copyrighted content without explicit permission or valid legal basis (e.g., fair use)",
          "Not use the service in any way that could damage, disable, overburden, or impair our servers, networks, or infrastructure",
          "Accept full legal and financial responsibility for any claims, lawsuits, or legal action resulting from your downloads",
          "Indemnify and hold MediaKeepa harmless from any legal consequences of your actions",
        ],
      },
      {
        heading: "3. Intellectual Property Rights",
        content: [
          "You acknowledge and agree that:",
        ],
        list: [
          "All content accessed through MediaKeepa may be protected by copyright, trademark, patent, or other intellectual property laws",
          "MediaKeepa does NOT grant you any rights, licenses, or permissions to use any content",
          "You must obtain all necessary rights, licenses, and permissions directly from content owners before downloading or using any copyrighted material",
          "Downloading copyrighted content without authorization is illegal and may subject you to civil and criminal penalties",
          "MediaKeepa is not responsible for determining whether content is copyrighted or whether you have rights to download it",
          "The MediaKeepa service itself (software, code, design, trademarks, documentation) is proprietary and protected by intellectual property laws",
        ],
      },
      {
        heading: "4. Prohibited Uses",
        content: [
          "You may not use MediaKeepa to:",
        ],
        list: [
          "Download copyrighted content without proper authorization",
          "Circumvent any technical protection measures",
          "Engage in commercial use without proper licenses",
          "Redistribute downloaded content without permission",
          "Use the service for any fraudulent or malicious purposes",
          "Attempt to reverse engineer, decompile, or disassemble any part of the service",
        ],
      },
      {
        heading: "5. Disclaimer of Warranties",
        content: [
          "MEDIAKEEPA IS PROVIDED ON AN 'AS IS' AND 'AS AVAILABLE' BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:",
        ],
        list: [
          "No warranty that the service will be uninterrupted, secure, error-free, or virus-free",
          "No warranty regarding the accuracy, reliability, legality, or availability of any content",
          "No warranty that downloads will be successful or that files will be free from defects",
          "No warranty that the service will meet your requirements or expectations",
          "No warranty of merchantability, fitness for a particular purpose, or non-infringement",
        ],
        content: [
          "YOU USE MEDIAKEEPA AT YOUR OWN RISK. We make no representations or warranties about the legality of downloading any specific content. Legal compliance is YOUR responsibility.",
        ],
      },
      {
        heading: "6. Limitation of Liability",
        content: [
          "TO THE MAXIMUM EXTENT PERMITTED BY LAW, MEDIAKEEPA, ITS OPERATORS, OWNERS, EMPLOYEES, AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR:",
        ],
        list: [
          "Any indirect, incidental, special, consequential, punitive, or exemplary damages",
          "Any loss of profits, revenues, data, use, goodwill, or other intangible losses",
          "Any damages resulting from your use or inability to use the service",
          "Any damages resulting from unauthorized access to your data or transmissions",
          "Any copyright infringement claims, DMCA notices, or legal action related to content you download",
          "Any legal fees, court costs, settlements, or judgments arising from your illegal use of downloaded content",
          "Any claims by third parties related to your downloads or use of content",
        ],
        content: [
          "IN NO EVENT SHALL MEDIAKEEPA'S TOTAL LIABILITY EXCEED $10 (TEN US DOLLARS). This limitation applies regardless of the legal theory (contract, tort, negligence, strict liability, or otherwise).",
        ],
      },
      {
        heading: "7. Indemnification",
        content: [
          "YOU AGREE TO INDEMNIFY, DEFEND, AND HOLD HARMLESS MediaKeepa and its owners, operators, affiliates, officers, directors, employees, agents, licensors, and suppliers from and against ANY AND ALL:",
        ],
        list: [
          "Claims, demands, actions, lawsuits, or proceedings brought by third parties",
          "Losses, liabilities, damages, costs, and expenses (including reasonable attorneys' fees)",
          "Arising out of or related to your use or misuse of the service",
          "Arising from your violation of these Terms or any applicable law",
          "Arising from your violation of any third-party rights, including intellectual property rights",
          "Arising from any content you download, including copyright infringement claims",
          "Arising from DMCA notices, cease and desist letters, or legal action related to your downloads",
        ],
        content: [
          "This indemnification obligation survives termination of your use of the service and continues indefinitely.",
        ],
      },
      {
        heading: "8. Modifications to Service and Terms",
        content: [
          "We reserve the right to modify or discontinue the service at any time without notice. We may also revise these Terms from time to time. Continued use of the service after any such changes constitutes your acceptance of the new Terms.",
        ],
      },
      {
        heading: "9. Termination",
        content: [
          "We may terminate or suspend your access to the service immediately, without prior notice or liability, for any reason, including breach of these Terms. Upon termination, your right to use the service will immediately cease.",
        ],
      },
      {
        heading: "10. Governing Law",
        content: [
          "These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law provisions. Any disputes arising from these Terms or the service shall be resolved in the appropriate courts.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "October 23, 2025",
    sections: [
      {
        content: [
          "At MediaKeepa, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your information when you use our service.",
        ],
      },
      {
        heading: "Information We Collect",
        content: [
          "MediaKeepa collects minimal information to provide our service:",
        ],
        list: [
          "URLs you submit for downloading (temporarily processed and not stored)",
          "Usage data such as browser type, device information, and IP address for analytics and security",
          "Cookies and similar technologies to improve user experience and remember preferences",
        ],
      },
      {
        heading: "How We Use Your Information",
        content: [
          "We use the collected information for the following purposes:",
        ],
        list: [
          "To provide and maintain our service functionality",
          "To process your download requests",
          "To improve and optimize our service",
          "To detect and prevent fraud, abuse, and security issues",
          "To communicate with you about service-related matters",
          "To comply with legal obligations",
        ],
      },
      {
        heading: "Data Storage and Security",
        content: [
          "We implement reasonable security measures to protect your information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.",
          "MediaKeepa does not permanently store the URLs you submit or the content you download. All processing is done in real-time, and temporary data is deleted immediately after completion.",
        ],
      },
      {
        heading: "Third-Party Services",
        content: [
          "Our service may interact with third-party platforms to facilitate downloads. We are not responsible for the privacy practices of these third-party services. We recommend reviewing their privacy policies before using our service.",
          "We may use third-party analytics services to help us understand how users interact with our service. These services may collect information about your use of our service and other websites.",
        ],
      },
      {
        heading: "Cookies and Tracking Technologies",
        content: [
          "We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.",
        ],
      },
      {
        heading: "Your Rights and Choices",
        content: [
          "Depending on your location, you may have certain rights regarding your personal information:",
        ],
        list: [
          "The right to access and receive a copy of your personal information",
          "The right to correct or update your personal information",
          "The right to delete your personal information",
          "The right to object to or restrict certain processing of your information",
          "The right to data portability",
        ],
      },
      {
        heading: "Children's Privacy",
        content: [
          "Our service is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.",
        ],
      },
      {
        heading: "International Data Transfers",
        content: [
          "Your information may be transferred to and maintained on servers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ from those in your jurisdiction.",
        ],
      },
      {
        heading: "Changes to This Privacy Policy",
        content: [
          "We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the 'Last Updated' date. You are advised to review this Privacy Policy periodically for any changes.",
        ],
      },
      {
        heading: "Data Retention",
        content: [
          "We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.",
        ],
      },
    ],
  },
  "how-it-works": {
    title: "How It Works",
    lastUpdated: "October 23, 2025",
    sections: [
      {
        content: [
          "MediaKeepa is a simple and powerful tool designed to help you download media content from various online platforms. Here's how our service works and what you need to know.",
        ],
      },
      {
        heading: "The Download Process",
        content: [
          "Using MediaKeepa is straightforward:",
        ],
        list: [
          "Paste the URL of the media content you want to download into the input field",
          "MediaKeepa automatically fetches information about the content, including title, thumbnail, and available formats",
          "Choose your preferred format (video, audio, or image) and quality settings",
          "Click the download button to start the download process",
          "Your file will be downloaded directly to your device",
        ],
      },
      {
        heading: "Supported Platforms",
        content: [
          "MediaKeepa works with a wide variety of popular media platforms. Our service continuously updates to support new platforms and maintain compatibility with existing ones.",
          "The service is platform-agnostic and designed to work with any publicly accessible media content, provided you have the right to download it.",
        ],
      },
      {
        heading: "Format Options",
        content: [
          "We offer multiple format options to suit your needs:",
        ],
        list: [
          "Video formats: MP4, WebM, MKV with quality options ranging from 144p to 8K",
          "Audio formats: MP3, M4A, FLAC with bitrate options from 64kbps to 320kbps",
          "Image formats: JPG, PNG, WebP for thumbnail extraction",
        ],
      },
      {
        heading: "Quality Selection",
        content: [
          "MediaKeepa allows you to choose the quality that best fits your needs. Higher quality options provide better visual or audio fidelity but result in larger file sizes. Lower quality options are perfect for saving bandwidth and storage space.",
          "The available quality options depend on the source content. If a particular quality is not available from the source, we'll show you the best available alternatives.",
        ],
      },
      {
        heading: "Technical Details",
        content: [
          "MediaKeepa operates as a client-side tool that processes your requests in real-time. We do not store or host any downloaded content. All downloads are performed directly from the source platforms to your device.",
          "Our service respects rate limits and technical restrictions of source platforms to ensure sustainable operation. This means that during high-traffic periods, you may experience slightly longer processing times.",
        ],
      },
      {
        heading: "Privacy and Security",
        content: [
          "Your privacy is important to us. MediaKeepa processes download requests without storing personal information or download history. URLs you submit are processed in real-time and immediately discarded after the download completes.",
          "We use secure connections (HTTPS) to protect your data during transmission. However, we recommend using a VPN if you have additional privacy concerns.",
        ],
      },
      {
        heading: "Legal Usage - READ CAREFULLY",
        content: [
          "⚠️ IMPORTANT LEGAL NOTICE: MediaKeepa is a SOFTWARE TOOL only. We do NOT host, store, or distribute any content. YOU are completely responsible for ensuring your downloads are legal.",
          "Before downloading ANY content, you must verify you have legal authorization. Acceptable uses include: (1) Content in the public domain with no copyright restrictions, (2) Content you personally own or created yourself, (3) Content for which you have obtained explicit written permission from the copyright owner, (4) Content covered by a valid license you purchased, (5) Content you are downloading for legally permitted purposes under fair use doctrine (educational, commentary, criticism - consult a lawyer).",
          "WARNING - Downloading copyrighted content without permission is ILLEGAL in most countries and can result in: Civil lawsuits with damages up to $150,000 per work infringed (in the US), criminal prosecution with potential jail time for willful infringement, DMCA takedown notices and legal threats, ISP account termination, and permanent legal records.",
          "MediaKeepa CANNOT and DOES NOT provide legal advice. We are NOT responsible for your downloads. If you're unsure whether downloading something is legal, DON'T DO IT or consult a lawyer. By using MediaKeepa, you accept FULL legal and financial responsibility for all your downloads. We will not defend you in court or pay your legal fees if you get sued for copyright infringement.",
        ],
      },
      {
        heading: "Best Practices",
        content: [
          "To get the best experience with MediaKeepa:",
        ],
        list: [
          "Ensure you have a stable internet connection",
          "Use the most recent version of your web browser",
          "Allow sufficient storage space on your device",
          "Respect content creators by using downloads ethically and legally",
          "Consider supporting creators through official channels when possible",
        ],
      },
      {
        heading: "Troubleshooting",
        content: [
          "If you experience issues with downloads:",
        ],
        list: [
          "Verify that the URL is correct and the content is publicly accessible",
          "Try a different format or quality option",
          "Clear your browser cache and cookies",
          "Disable browser extensions that might interfere with downloads",
          "Contact our support team if problems persist",
        ],
      },
      {
        heading: "Future Improvements",
        content: [
          "We're constantly working to improve MediaKeepa. Planned features include support for additional formats, batch downloading capabilities, and enhanced quality options. Stay tuned for updates!",
        ],
      },
    ],
  },
}
