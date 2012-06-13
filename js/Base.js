/**
 * @fileoverview Entry point for Google CSS Filter Demo.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.start');

goog.require('gfd.Controller');
goog.require('gfd.SvgArtElement');

/**
 * @type {gfd.Controller}
 * @private
 */
gfd.controller_;



/**
 * Starts everything.
 */
gfd.start = function()
{
  window['requestAnimFrame'] = (function() {
    return window['requestAnimationFrame'] ||
           window['webkitRequestAnimationFrame'] ||
           window['mozRequestAnimationFrame'] ||
           window['oRequestAnimationFrame'] ||
           window['msRequestAnimationFrame'] ||
           function(/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
             window.setTimeout(callback, 1000/60);
           };
  })();
  
  gfd.controller_ = new gfd.Controller();
  gfd.controller_.start();
};

/**
 * Does anything on document ready.
 */
window.addEventListener('load',
  function()
  {
    //Preload svg hack
    if (gfd.controller_)
    {
      gfd.controller_.load();
    }
  });

goog.exportSymbol('gfd.start', gfd.start);
goog.exportSymbol('gfd.preload', gfd.preload);