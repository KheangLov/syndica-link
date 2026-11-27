/** Crawlers that should get the compact (square thumbnail) card: Facebook, Messenger, WhatsApp, Instagram/Threads. */
export const isCompactPreviewBot = (ua = '') => /facebookexternalhit|facebookcatalog|Facebot|meta-externalagent|WhatsApp/i.test(ua)
