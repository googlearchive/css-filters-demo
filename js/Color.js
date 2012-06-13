/**
 * @fileoverview Basic color object.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.Color');

/**
 * A color object, don't modify rgb values, instead create a clone and modify 
 * that. Since some values like hex get cached.
 * @constructor
 */
gfd.Color = function(r,g,b,opt_a)
{
  this.r = r;
  this.g = g;
  this.b = b;
  this.a = goog.isDef(opt_a) ? opt_a : 1;
  this.nr = r / 255;
  this.ng = g / 255;
  this.nb = b / 255;
  this.na = this.a;
  this.hex = null;
};


/**
 * Basic white color.
 * @type {gfd.Color}
 */
gfd.Color.WHITE = new gfd.Color(255, 255, 255);


/**
 * Basic black color.
 * @type {gfd.Color}
 */
gfd.Color.BLACK = new gfd.Color(0, 0, 0);


/**
 * Copies the color object.
 * @returns {gfd.Color}
 */
gfd.Color.prototype.clone = function()
{
  return new gfd.Color(this.r, this.g, this.b);
};


/**
 * Utility function to fill an array, hopefully inlined by closure.
 * @param {Array.<number>} arr
 * @param {number} index
 */
gfd.Color.prototype.fillVec4Array = function(arr, index)
{
  arr[index] = this.nr;
  arr[index+1] = this.ng;
  arr[index+2] = this.nb;
  arr[index+3] = this.na;
};


/**
 * Returns the css string for the color. No alpha.
 * @returns {string}
 */
gfd.Color.prototype.toCssColorString = function()
{
  var c = this;
  return c.hex ||
       (c.hex = '#' + (c.r < 16 ? ('0' + c.r.toString(16)) : c.r.toString(16)) +
                      (c.g < 16 ? ('0' + c.g.toString(16)) : c.g.toString(16)) +
                      (c.b < 16 ? ('0' + c.b.toString(16)) : c.b.toString(16)));
};