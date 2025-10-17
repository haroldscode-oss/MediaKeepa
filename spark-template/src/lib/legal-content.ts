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
    lastUpdated: "January 17, 2025",
    contactEmail: "dmca@mediakeepa.com",
    sections: [
      {
        content: [
          "MediaKeepa respects the intellectual property rights of others and expects its users to do the same. In accordance with the Digital Millennium Copyright Act of 1998 (DMCA), we will respond expeditiously to claims of copyright infringement committed using our service.",
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
          "MediaKeepa is a tool that provides download functionality. Users are solely responsible for ensuring they have the right to download and use any content. We do not host, store, or distribute any copyrighted content. All downloads are performed directly from the original source platforms.",
          "By using MediaKeepa, you agree to only download content that you have the legal right to access and use, including content that is in the public domain, content you own, or content for which you have obtained proper authorization.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    lastUpdated: "January 17, 2025",
    sections: [
      {
        content: [
          "Welcome to MediaKeepa. By accessing or using our service, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.",
        ],
      },
      {
        heading: "1. Description of Service",
        content: [
          "MediaKeepa provides a media downloading tool that allows users to download publicly available media content from various online platforms. Our service acts as a facilitator and does not host, store, or distribute any content.",
        ],
      },
      {
        heading: "2. User Responsibilities",
        content: [
          "You are solely responsible for your use of MediaKeepa and for any content you download. You agree to:",
        ],
        list: [
          "Only download content that you have the legal right to access and use",
          "Comply with all applicable laws and regulations, including copyright laws",
          "Not use the service for any illegal or unauthorized purpose",
          "Not violate the terms of service of any third-party platforms",
          "Respect intellectual property rights of content creators and copyright holders",
          "Not use the service in any way that could damage, disable, or impair our servers or networks",
        ],
      },
      {
        heading: "3. Intellectual Property Rights",
        content: [
          "You acknowledge that all content downloaded through MediaKeepa may be protected by copyright, trademark, or other intellectual property laws. MediaKeepa does not grant you any rights to such content, and you must obtain proper authorization before using any downloaded content.",
          "The service itself, including all software, code, design, and trademarks, is the property of MediaKeepa and is protected by applicable intellectual property laws.",
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
          "MediaKeepa is provided on an 'as is' and 'as available' basis without warranties of any kind, either express or implied. We do not guarantee that the service will be uninterrupted, secure, or error-free. We make no warranties regarding the accuracy, reliability, or availability of any content downloaded through our service.",
        ],
      },
      {
        heading: "6. Limitation of Liability",
        content: [
          "To the maximum extent permitted by law, MediaKeepa shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the service.",
        ],
      },
      {
        heading: "7. Indemnification",
        content: [
          "You agree to indemnify and hold harmless MediaKeepa and its affiliates, officers, agents, and employees from any claim, demand, or damage, including reasonable attorneys' fees, arising out of or related to your use of the service, your violation of these Terms, or your violation of any rights of another party.",
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
    lastUpdated: "January 17, 2025",
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
    lastUpdated: "January 17, 2025",
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
        heading: "Legal Usage",
        content: [
          "MediaKeepa is a tool that provides functionality. You, the user, are responsible for ensuring that your use of the service complies with applicable laws and the terms of service of source platforms.",
          "Always verify that you have the legal right to download and use any content. This includes:",
        ],
        list: [
          "Content that is in the public domain",
          "Content that you own or created yourself",
          "Content for which you have obtained proper authorization or licensing",
          "Content used under fair use provisions (varies by jurisdiction)",
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
