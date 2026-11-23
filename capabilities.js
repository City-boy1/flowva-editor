/* FlowvaEditor capability reference.
 * This is a browser-global registry for the current no-build baseline.
 * Marketplace must mirror these decisions server-side; never trust this client file for authorization.
 * A capability must not be enabled until representative fixtures and tests pass.
 */
(function (root) {
  const entries = {
    PSD: { create: true, edit: true, localOpen: true, module: 'design', status: 'verify-roundtrip', warning: 'Some Photoshop effects, smart objects, adjustment layers and text styling may not survive round-trip.' },
    PSB: { create: false, edit: false, localOpen: false, module: 'design', status: 'unverified', warning: 'Large-document support has not been verified.' },
    PDF: { create: true, edit: 'limited', localOpen: 'limited', module: 'design', status: 'limited', warning: 'Imported pages are treated as backgrounds with editable overlays; this is not native PDF content editing.' },
    GLB: { create: false, edit: false, localOpen: false, module: 'model3d', status: 'planned' },
    FBX: { create: false, edit: 'convert', localOpen: 'planned', module: 'model3d', status: 'planned', warning: 'Import/convert to GLB only; animation and rigging may be lost.' },
    AI: { create: 'experimental', edit: false, localOpen: false, module: 'design', status: 'experimental', warning: 'Do not claim native Illustrator compatibility.' },
    FCPXML: { create: false, edit: false, localOpen: false, module: 'timeline', status: 'planned' },
    SKETCH: { create: false, edit: false, localOpen: false, module: 'design', status: 'optional-research' }
  };
  const unsupported = [
    'CANVA','INDD','CDR','AFDESIGN','AFPHOTO','FIG','AEP','PRPROJ','DRP','BLEND','C4D','MAX','MA','FLA','SPINE',
    'PLP','IBIS','PXD','GODADDY_STUDIO','ALIGHT','KMPROJECT','VNPROJ','CAPCUT'
  ];
  root.FLOWVA_CAPABILITIES = Object.freeze({
    get(type) { return entries[String(type || '').toUpperCase()] || { create: false, edit: false, localOpen: false, status: unsupported.includes(String(type || '').toUpperCase()) ? 'unsupported' : 'unknown' }; },
    entries: Object.freeze(entries),
    unsupported: Object.freeze(unsupported)
  });
})(typeof window !== 'undefined' ? window : globalThis);
