/**
 * @fileoverview This isn't really used.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.Selection');

goog.require('gfd.ArtElement');

/**
 * A selection object. Generic for now, when you call select on an artelement,
 * it could insert extra data into subSel.
 * @param {gfd.ArtElement} artEl
 * @param {Object=} opt_sub subselection data.
 * @constructor
 */
gfd.Selection = function(artEl, opt_sub)
{
  this.artEl = artEl;
  this.subSel = opt_sub;
};