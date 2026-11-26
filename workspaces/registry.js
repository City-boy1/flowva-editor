/* FlowvaEditor workspace registry.
 * Describes the current client experience only; it is not an authorization policy.
 * Keep advertised tools and formats aligned with real editor implementations and tests.
 */
(function (root) {
  'use strict';

  const categories = [
    {
      id: 'graphic-design', label: 'Graphic Design', icon: 'palette', cardClass: 'workspace-graphic',
      cardDescription: 'Flyers, posters, business cards and print artwork', cardImage: 'assets/workspaces/graphic-design.webp', cardImageAlt: 'A collage of flyer, poster and business card designs', cardCta: 'Start creating',
      description: 'Flyers, posters, business cards, photo graphics and print artwork.',
      status: 'active', editorType: 'design-canvas',
      tools: ['canvas', 'selection-transform', 'text', 'shapes', 'images', 'layers', 'zoom', 'undo-redo'],
      panels: ['uploads', 'properties', 'layers'],
      imports: ['images', 'svg', 'psd', 'pdf-limited'],
      exports: ['png', 'jpg', 'pdf-basic', 'flowva-project'],
      limitations: ['Single-canvas editing; no multi-page documents.', 'PSD layer fidelity is limited; PSD export is not available.', 'PDF import is not native PDF content editing.'],
      presets: [
        { id:'business-card', label:'Business Card', dimensions:'1050 × 600 px', description:'Landscape business card', width:1050, height:600, timeline:false, editorTitle:'Business card' },
        { id:'flyer', label:'Flyer (A4)', dimensions:'1240 × 1754 px', description:'A4 portrait promotional design', width:1240, height:1754, timeline:false, editorTitle:'Flyer' },
        { id:'poster', label:'Poster', dimensions:'1080 × 1350 px', description:'Portrait poster design', width:1080, height:1350, timeline:false, editorTitle:'Poster' },
        { id:'invitation', label:'Invitation', dimensions:'1240 × 1754 px', description:'Single-page invitation', width:1240, height:1754, timeline:false, editorTitle:'Invitation' },
        { id:'brochure-page', label:'Brochure Page', dimensions:'1240 × 1754 px', description:'Design one brochure page at a time', width:1240, height:1754, timeline:false, editorTitle:'Brochure Page' },
        { id:'letterhead', label:'Letterhead', dimensions:'1240 × 1754 px', description:'A4 letterhead page', width:1240, height:1754, timeline:false, editorTitle:'Letterhead' },
        { id:'menu', label:'Menu', dimensions:'1240 × 1754 px', description:'Single-page menu design', width:1240, height:1754, timeline:false, editorTitle:'Menu' },
        { id:'certificate', label:'Certificate', dimensions:'1754 × 1240 px', description:'Landscape certificate', width:1754, height:1240, timeline:false, editorTitle:'Certificate' },
        { id:'photo-canvas', label:'Photo Editing Canvas', dimensions:'1080 × 1080 px', description:'Add an image and use the editor image tools', width:1080, height:1080, timeline:false, editorTitle:'Photo Editing Canvas' },
        { id:'psd-edit', label:'Open & edit Photoshop PSD', dimensions:'Existing file dimensions', description:'Import a PSD and edit its supported layers; export to PNG, JPG or PDF', width:1080, height:1080, timeline:false, icon:'file-image', editorTitle:'Open & edit Photoshop PSD' },
        { id:'square-graphic', label:'Custom Square Graphic', dimensions:'1080 × 1080 px', description:'General-purpose square graphic', width:1080, height:1080, timeline:false , editorTitle:'Square Graphic'}
      ]
    },
    {
      id: 'social', label: 'Social Media', icon: 'instagram', cardClass: 'workspace-social',
      cardDescription: 'Posts, stories, covers and digital graphics', cardImage: 'assets/workspaces/social-media.jpg', cardImageAlt: 'A collage of social media post and story designs', cardCta: 'Start creating',
      description: 'Posts, stories, covers and digital graphics.',
      status: 'active', editorType: 'design-canvas',
      tools: ['canvas', 'selection-transform', 'text', 'shapes', 'images', 'layers', 'zoom', 'undo-redo'],
      panels: ['uploads', 'properties', 'layers'],
      imports: ['images', 'svg', 'psd'],
      exports: ['png', 'jpg', 'flowva-project'],
      limitations: ['Presets create individual canvases; multi-artboard layouts, safe-zone overlays and batch resize are not implemented.', 'Video export is available only for timeline-enabled projects.'],
      presets: [
        { id:'social-post', label:'Instagram Post', dimensions:'1080 × 1080 px', description:'Square social graphic', width:1080, height:1080, timeline:false, editorTitle:'Instagram Post' },
        { id:'social-story', label:'Instagram Story / WhatsApp Status', dimensions:'1080 × 1920 px', description:'Vertical social graphic', width:1080, height:1920, timeline:false, editorTitle:'Instagram Story / WhatsApp Status' },
        { id:'facebook-cover', label:'Facebook Cover', dimensions:'1640 × 624 px', description:'Wide profile or page cover', width:1640, height:624, timeline:false, editorTitle:'Facebook Cover' },
        { id:'linkedin-post', label:'LinkedIn Post', dimensions:'1200 × 627 px', description:'Landscape professional post', width:1200, height:627, timeline:false, editorTitle:'LinkedIn Post' },
        { id:'youtube-thumbnail', label:'YouTube Thumbnail', dimensions:'1280 × 720 px', description:'Video cover image', width:1280, height:720, timeline:false, editorTitle:'YouTube Thumbnail' },
        { id:'web-banner', label:'Web Banner', dimensions:'1920 × 600 px', description:'Wide website or campaign banner', width:1920, height:600, timeline:false , editorTitle:'Web Banner'}
      ]
    },
    {
      id: 'documents', label: 'Documents & Publishing', icon: 'file-text', cardClass: 'workspace-documents',
      cardDescription: 'CVs, reports, menus and page layouts', cardImage: 'assets/workspaces/documents.jpg', cardImageAlt: 'A collage of document, CV and brochure layouts', cardCta: 'Start creating',
      description: 'Create and export individual document pages as PDF.',
      status: 'limited', editorType: 'design-canvas',
      tools: ['canvas', 'selection-transform', 'text', 'shapes', 'images', 'layers', 'zoom', 'undo-redo'],
      panels: ['uploads', 'properties', 'layers'],
      imports: ['images', 'svg', 'pdf-limited'],
      exports: ['png', 'jpg', 'pdf-basic', 'flowva-project'],
      limitations: ['Each preset creates one canvas page; multi-page documents, text flow, page numbering and page reordering are not implemented.', 'PDF export currently wraps the active canvas as a basic PDF page.'],
      presets: [
        { id:'pdf-page', label:'PDF Page (A4)', dimensions:'1240 × 1754 px', description:'Single A4 page; export as PDF', width:1240, height:1754, timeline:false, editorTitle:'PDF Page' },
        { id:'letter-page', label:'PDF Page (US Letter)', dimensions:'1275 × 1650 px', description:'Single US Letter page', width:1275, height:1650, timeline:false, editorTitle:'US Letter PDF Page' },
        { id:'resume-page', label:'Resume / CV Page', dimensions:'1240 × 1754 px', description:'Design one resume page at a time', width:1240, height:1754, timeline:false, editorTitle:'Resume / CV Page' },
        { id:'report-page', label:'Report Page', dimensions:'1240 × 1754 px', description:'Design one report page at a time', width:1240, height:1754, timeline:false , editorTitle:'Report Page'}
      ]
    },
    {
      id: 'branding', label: 'Logo & Branding', icon: 'shapes', cardClass: 'workspace-branding',
      cardDescription: 'Logo artwork, app icons and brand graphics', cardImage: 'assets/workspaces/branding.jpg', cardImageAlt: 'A visual identity board with logo and brand colors', cardCta: 'Start creating',
      description: 'Create logo artwork and simple brand graphics with the existing canvas tools.',
      status: 'active', editorType: 'design-canvas',
      tools: ['canvas', 'selection-transform', 'text', 'shapes', 'images', 'layers', 'zoom', 'undo-redo'],
      panels: ['uploads', 'properties', 'layers'],
      imports: ['images', 'svg', 'psd'],
      exports: ['png', 'jpg', 'pdf-basic', 'flowva-project'],
      limitations: ['This is a raster/design-canvas workflow, not a precision vector editor.', 'SVG export and advanced path/node editing are not available.'],
      presets: [
        { id:'logo', label:'Logo Canvas', dimensions:'1000 × 1000 px', description:'Square canvas for logo artwork', width:1000, height:1000, timeline:false, editorTitle:'Logo' },
        { id:'icon', label:'App Icon', dimensions:'512 × 512 px', description:'Square icon or graphic', width:512, height:512, timeline:false , editorTitle:'App Icon'}
      ]
    },
    {
      id: 'video', label: 'Video & Motion', icon: 'clapperboard', cardClass: 'workspace-video',
      cardDescription: 'Video canvases and timeline-based animation', cardImage: 'assets/workspaces/video-motion.jpg', cardImageAlt: 'A video editing and motion graphics collage', cardCta: 'Start creating',
      description: 'Video canvases and animated designs with a timeline.',
      status: 'limited', editorType: 'timeline-canvas',
      tools: ['canvas', 'selection-transform', 'text', 'shapes', 'images', 'layers', 'timeline', 'video-media', 'audio-media', 'lottie-media', 'zoom', 'undo-redo'],
      panels: ['uploads', 'properties', 'layers', 'timeline'],
      imports: ['images', 'svg', 'psd', 'video', 'audio', 'lottie'],
      exports: ['png', 'jpg', 'pdf-basic', 'video-browser-dependent', 'flowva-project'],
      limitations: ['Video rendering depends on browser MediaRecorder and codec support; verify output in the target browser.', 'The .flowva package is the editable project backup; it is not a marketplace sale format.'],
      presets: [
        { id:'video', label:'Video (Landscape)', dimensions:'1920 × 1080 px', description:'Full HD video project', width:1920, height:1080, timeline:true, editorTitle:'Video' },
        { id:'video-vertical', label:'Video (Vertical)', dimensions:'1080 × 1920 px', description:'Vertical video for reels and shorts', width:1080, height:1920, timeline:true, editorTitle:'Vertical Video' },
        { id:'video-square', label:'Video (Square)', dimensions:'1080 × 1080 px', description:'Square video for social feeds', width:1080, height:1080, timeline:true, editorTitle:'Square Video' },
        { id:'animated-post', label:'Animated Social Post', dimensions:'1080 × 1080 px', description:'Animate objects and add media on the timeline', width:1080, height:1080, timeline:true , editorTitle:'Animated Social Post'}
      ]
    },
    {
      id: 'models-3d', label: '3D & Models', icon: 'box', cardClass: 'workspace-3d',
      cardDescription: '3D creation is on the Flowva roadmap', cardImage: 'assets/workspaces/models-3d.jpg', cardImageAlt: 'A 3D product visualization preview', cardCta: "Explore what's next", cardBadge: 'Coming soon', cardAriaLabel: '3D and Models, coming soon',
      description: 'A future workspace for 3D creation. Model editing is not available in this build yet.',
      status: 'planned', editorType: 'scene-3d',
      tools: [], panels: [], imports: [], exports: [], presets: [],
      limitations: ['3D editing, model import and 3D export are not implemented.']
    }
  ];

  const presets = Object.create(null);
  categories.forEach(category => category.presets.forEach(preset => {
    presets[preset.id] = Object.freeze({ ...preset, preset: preset.id, category: category.id });
  }));

  root.FLOWVA_WORKSPACES = Object.freeze({
    categories: Object.freeze(categories.map(category => Object.freeze({
      ...category,
      tools: Object.freeze(category.tools.slice()),
      panels: Object.freeze(category.panels.slice()),
      imports: Object.freeze(category.imports.slice()),
      exports: Object.freeze(category.exports.slice()),
      limitations: Object.freeze(category.limitations.slice()),
      presets: Object.freeze(category.presets.map(preset => Object.freeze({ ...preset })))
    }))),
    presets: Object.freeze(presets),
    get(id) { return categories.find(category => category.id === id) || null; }
  });
})(typeof window !== 'undefined' ? window : globalThis);
